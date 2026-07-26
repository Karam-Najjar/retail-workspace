import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { DraftCartItem } from '../../domain/models/draft-cart-item.model';
import { InventoryBatch } from '../../domain/models/inventory-batch.model';
import { InventoryMovement } from '../../domain/models/inventory-movement.model';
import { Product } from '../../domain/models/product.model';
import { SaleCompletedPayload } from '../../domain/events/sale-completed.payload';
import { SaleItemBatchAllocation } from '../../domain/models/sale-item-batch-allocation.model';
import { SaleItem } from '../../domain/models/sale-item.model';
import { Sale } from '../../domain/models/sale.model';
import { allocateFifo } from '../../domain/policies/fifo-allocation.policy';
import {
  SaleCheckoutRequest,
  SaleDetail,
  SaleListEntry,
  SaleListFilter,
  SaleRepository,
} from '../../domain/repository-contracts/sale.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieSaleRepository implements SaleRepository {
  private readonly database = inject(RetailDatabase);

  async checkout(request: SaleCheckoutRequest): Promise<Sale> {
    this.assertRequest(request);
    try {
      return await this.database.transaction('rw', [
        this.database.sales,
        this.database.saleItems,
        this.database.saleItemBatchAllocations,
        this.database.products,
        this.database.inventoryBatches,
        this.database.inventoryMovements,
        this.database.activity_logs,
        this.database.draftCarts,
      ], async () => {
        const existingSale = await this.database.sales
          .where('idempotency_key')
          .equals(request.idempotencyKey)
          .first();
        if (existingSale) return existingSale;

        const draft = await this.database.draftCarts.get('active');
        if (!draft?.items.length) throw new Error('The persisted cart is empty.');
        if (!this.sameCart(draft.items, request.items)) {
          throw new Error('The cart changed before checkout. Review it and try again.');
        }

        const requestedByProduct = this.aggregateRequestedQuantities(request.items);
        const products = new Map<string, Product>();
        const batchesByProduct = new Map<string, readonly InventoryBatch[]>();
        for (const [productId, requestedQuantity] of requestedByProduct) {
          const product = await this.database.products.get(productId);
          if (!product) throw new Error('A product in the cart could not be found.');
          const batches = await this.database.inventoryBatches
            .where('product_id')
            .equals(productId)
            .toArray();
          this.assertInventoryIntegrity(product, batches);
          if (requestedQuantity > product.quantity) {
            throw new Error(`Only ${product.quantity} units of '${product.name}' are available.`);
          }
          products.set(productId, product);
          batchesByProduct.set(productId, batches);
        }

        const saleId = crypto.randomUUID();
        const saleItems: SaleItem[] = [];
        const allocations: SaleItemBatchAllocation[] = [];
        const movements: InventoryMovement[] = [];
        const affectedBatches = new Map<string, InventoryBatch>();
        let totalAmount = 0;
        let totalCost = 0;

        for (const cartItem of request.items) {
          const product = products.get(cartItem.product_id);
          const currentBatches = batchesByProduct.get(cartItem.product_id);
          if (!product || !currentBatches) throw new Error('A product in the cart could not be found.');

          const allocationResult = allocateFifo(currentBatches, cartItem.quantity_base_units);
          const updatedForLine = new Map(
            allocationResult.allocations.map((allocation) => [allocation.batch.id, allocation.batch]),
          );
          const nextBatches = currentBatches.map((batch) => updatedForLine.get(batch.id) ?? batch);
          batchesByProduct.set(cartItem.product_id, nextBatches);
          allocationResult.allocations.forEach((allocation) => affectedBatches.set(allocation.batch.id, allocation.batch));

          const saleItemId = crypto.randomUUID();
          const subtotalAmount = this.safeMultiply(
            cartItem.quantity_base_units,
            cartItem.selling_price_per_unit,
            'Sale line total is too large.',
          );
          const item: SaleItem = {
            id: saleItemId,
            sale_id: saleId,
            product_id: product.id,
            product_name: cartItem.product_name,
            barcode_scanned: cartItem.barcode,
            quantity_base_units: cartItem.quantity_base_units,
            selling_price_per_unit: cartItem.selling_price_per_unit,
            subtotal_amount: subtotalAmount,
            total_cost: allocationResult.total_allocated_cost,
            total_profit: subtotalAmount - allocationResult.total_allocated_cost,
          };
          saleItems.push(item);
          totalAmount = this.safeAdd(totalAmount, item.subtotal_amount, 'Sale total is too large.');
          totalCost = this.safeAdd(totalCost, item.total_cost, 'Sale cost total is too large.');

          for (const allocation of allocationResult.allocations) {
            allocations.push({
              id: crypto.randomUUID(),
              sale_item_id: saleItemId,
              batch_id: allocation.batch.id,
              quantity_consumed: allocation.quantity,
              allocated_cost: allocation.allocated_cost,
            });
            movements.push({
              id: crypto.randomUUID(),
              product_id: product.id,
              type: 'sale',
              quantity_change: -allocation.quantity,
              batch_id: allocation.batch.id,
              sale_id: saleId,
              supply_id: null,
              adjustment_id: null,
              operator_id: request.operatorId,
              operator_name: request.operatorName,
              reason: null,
              created_at: request.date,
            });
          }
        }

        const totalProfit = totalAmount - totalCost;
        const sale: Sale = {
          id: saleId,
          date: request.date,
          total_amount: totalAmount,
          total_cost: totalCost,
          total_profit: totalProfit,
          payment_method: 'cash',
          operator_id: request.operatorId,
          operator_name: request.operatorName,
          currency_snapshot: request.createCurrencySnapshot(totalAmount, totalCost),
          idempotency_key: request.idempotencyKey,
          created_at: request.date,
        };
        const updatedProducts = [...requestedByProduct].map(([productId, requestedQuantity]) => {
          const product = products.get(productId);
          const batches = batchesByProduct.get(productId);
          if (!product || !batches) throw new Error('A product in the cart could not be found.');
          const quantity = product.quantity - requestedQuantity;
          this.assertBatchQuantity(productId, batches, quantity);
          return {
            ...product,
            quantity,
            last_modified_by_operator_id: request.operatorId,
            updated_at: request.date,
          };
        });
        const payload: SaleCompletedPayload = {
          sale_id: sale.id,
          item_count: saleItems.length,
          total_items_sold: saleItems.reduce((sum, item) => this.safeAdd(sum, item.quantity_base_units, 'Sale item quantity is too large.'), 0),
          total_amount: sale.total_amount,
          total_cost: sale.total_cost,
          total_profit: sale.total_profit,
          items: saleItems.map((item) => ({
            sale_item_id: item.id,
            product_id: item.product_id,
            quantity_base_units: item.quantity_base_units,
            subtotal_amount: item.subtotal_amount,
            total_cost: item.total_cost,
            total_profit: item.total_profit,
          })),
        };
        const activityLog: ActivityLog<SaleCompletedPayload> = {
          id: crypto.randomUUID(),
          event_code: 'sale_completed',
          entity_type: 'sale',
          entity_id: sale.id,
          entity_name_snapshot: null,
          payload,
          operator_id: sale.operator_id,
          operator_name: sale.operator_name,
          related_sale_id: sale.id,
          related_supply_id: null,
          created_at: sale.created_at,
        };

        await this.database.sales.add(sale);
        await this.database.saleItems.bulkAdd(saleItems);
        await this.database.saleItemBatchAllocations.bulkAdd(allocations);
        await this.database.inventoryBatches.bulkPut([...affectedBatches.values()]);
        await this.database.inventoryMovements.bulkAdd(movements);
        await this.database.products.bulkPut(updatedProducts);
        await this.database.activity_logs.add(activityLog);
        await this.database.draftCarts.delete('active');
        for (const product of updatedProducts) {
          await this.assertStoredQuantity(product.id, product.quantity);
        }
        return sale;
      });
    } catch (error: unknown) {
      const existingSale = await this.getByIdempotencyKey(request.idempotencyKey);
      if (existingSale) return existingSale;
      throw error;
    }
  }

  async list(filter: SaleListFilter = {}): Promise<readonly SaleListEntry[]> {
    const sales = filter.from && filter.to
      ? await this.database.sales.where('date').between(filter.from, filter.to, true, true).reverse().sortBy('date')
      : await this.database.sales.orderBy('date').reverse().toArray();
    if (!sales.length) return [];
    const saleIds = sales.map((sale) => sale.id);
    const items = await this.database.saleItems.where('sale_id').anyOf(saleIds).toArray();
    const totals = new Map<string, number>();
    for (const item of items) {
      totals.set(item.sale_id, (totals.get(item.sale_id) ?? 0) + item.quantity_base_units);
    }
    return sales.map((sale) => ({ sale, totalItemsSold: totals.get(sale.id) ?? 0 }));
  }

  async getDetail(id: string): Promise<SaleDetail | undefined> {
    const sale = await this.database.sales.get(id);
    if (!sale) return undefined;
    const items = await this.database.saleItems.where('sale_id').equals(id).toArray();
    const itemIds = items.map((item) => item.id);
    const allocations = itemIds.length
      ? await this.database.saleItemBatchAllocations.where('sale_item_id').anyOf(itemIds).toArray()
      : [];
    return { sale, items, allocations };
  }

  getByIdempotencyKey(idempotencyKey: string): Promise<Sale | undefined> {
    return this.database.sales.where('idempotency_key').equals(idempotencyKey).first();
  }

  private assertRequest(request: SaleCheckoutRequest): void {
    if (!request.idempotencyKey.trim()) throw new Error('An idempotency key is required.');
    if (!request.operatorId.trim() || !request.operatorName.trim()) throw new Error('An active operator is required.');
    if (!(request.date instanceof Date) || Number.isNaN(request.date.getTime())) throw new Error('A valid sale date is required.');
    if (!request.items.length) throw new Error('The cart is empty.');
    for (const item of request.items) this.assertCartItem(item);
  }

  private assertCartItem(item: DraftCartItem): void {
    if (!item.product_id.trim() || !item.product_name.trim()) throw new Error('A cart product is invalid.');
    if (!Number.isSafeInteger(item.multiplier) || item.multiplier <= 0) throw new Error('A cart package multiplier is invalid.');
    if (!Number.isSafeInteger(item.package_quantity) || item.package_quantity <= 0) throw new Error('A cart quantity is invalid.');
    if (!Number.isSafeInteger(item.quantity_base_units) || item.quantity_base_units <= 0) throw new Error('A cart quantity is invalid.');
    if (item.quantity_base_units !== item.package_quantity * item.multiplier) throw new Error('A cart package quantity is inconsistent.');
    if (!Number.isSafeInteger(item.selling_price_per_unit) || item.selling_price_per_unit <= 0) throw new Error('A cart selling price is invalid.');
  }

  private aggregateRequestedQuantities(items: readonly DraftCartItem[]): ReadonlyMap<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      const nextQuantity = this.safeAdd(
        quantities.get(item.product_id) ?? 0,
        item.quantity_base_units,
        'Requested product quantity is too large.',
      );
      quantities.set(item.product_id, nextQuantity);
    }
    return quantities;
  }

  private assertInventoryIntegrity(product: Product, batches: readonly InventoryBatch[]): void {
    if (!Number.isSafeInteger(product.quantity) || product.quantity < 0) {
      throw new Error(`Inventory data for '${product.name}' is invalid.`);
    }
    for (const batch of batches) {
      if (!Number.isSafeInteger(batch.sequence) || batch.sequence <= 0
        || !Number.isSafeInteger(batch.remaining_quantity) || batch.remaining_quantity < 0
        || !Number.isSafeInteger(batch.remaining_total_cost) || batch.remaining_total_cost < 0
        || (batch.remaining_quantity === 0 && batch.remaining_total_cost !== 0)) {
        console.error(`Inventory integrity failure for product ${product.id}: invalid batch ${batch.id}`);
        throw new Error('Inventory integrity check failed. Checkout is blocked.');
      }
    }
    this.assertBatchQuantity(product.id, batches, product.quantity);
  }

  private assertBatchQuantity(productId: string, batches: readonly InventoryBatch[], expectedQuantity: number): void {
    const actualQuantity = batches.reduce(
      (sum, batch) => this.safeAdd(sum, batch.remaining_quantity, 'Inventory quantity is too large.'),
      0,
    );
    if (actualQuantity !== expectedQuantity) {
      console.error(`Inventory integrity failure for product ${productId}: cached=${expectedQuantity}, batches=${actualQuantity}`);
      throw new Error('Inventory integrity check failed. Checkout is blocked.');
    }
  }

  private async assertStoredQuantity(productId: string, expectedQuantity: number): Promise<void> {
    const batches = await this.database.inventoryBatches.where('product_id').equals(productId).toArray();
    this.assertBatchQuantity(productId, batches, expectedQuantity);
  }

  private sameCart(left: readonly DraftCartItem[], right: readonly DraftCartItem[]): boolean {
    return left.length === right.length && left.every((item, index) => {
      const other = right[index];
      return !!other
        && item.product_id === other.product_id
        && item.product_name === other.product_name
        && item.product_barcode_id === other.product_barcode_id
        && item.barcode === other.barcode
        && item.package_type_code === other.package_type_code
        && item.multiplier === other.multiplier
        && item.package_quantity === other.package_quantity
        && item.quantity_base_units === other.quantity_base_units
        && item.selling_price_per_unit === other.selling_price_per_unit
        && item.entry_method === other.entry_method;
    });
  }

  private safeAdd(left: number, right: number, message: string): number {
    const result = left + right;
    if (!Number.isSafeInteger(result)) throw new Error(message);
    return result;
  }

  private safeMultiply(left: number, right: number, message: string): number {
    const result = left * right;
    if (!Number.isSafeInteger(result)) throw new Error(message);
    return result;
  }
}
