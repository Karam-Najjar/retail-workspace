import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { DraftCartItem } from "../../domain/models/draft-cart-item.model";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../domain/models/inventory-movement.model";
import { Product } from "../../domain/models/product.model";
import { SaleCompletedPayload } from "../../domain/events/sale-completed.payload";
import { SaleItemBatchAllocation } from "../../domain/models/sale-item-batch-allocation.model";
import { SaleItem } from "../../domain/models/sale-item.model";
import { Sale } from "../../domain/models/sale.model";
import { SaleCurrencySnapshot } from "../../domain/models/sale-currency-snapshot.model";
import { allocateFifo } from "../../domain/policies/fifo-allocation.policy";
import { CURRENCY_ROUNDING_POLICY } from "../../domain/policies/currency-rounding.policy";
import {
  ReverseSaleRequest,
  SaleCheckoutRequest,
  SaleDetail,
  SaleListEntry,
  SaleListFilter,
  SaleRepository,
} from "../../domain/repository-contracts/sale.repository";
import { RetailDatabase } from "../database/retail.database";
import Decimal from "decimal.js";
import { createPagedResult, PagedResult } from "@retail/kernel";

@Injectable({ providedIn: "root" })
export class DexieSaleRepository implements SaleRepository {
  private readonly database = inject(RetailDatabase);

  async checkout(request: SaleCheckoutRequest): Promise<Sale> {
    this.assertRequest(request);
    try {
      return await this.database.transaction(
        "rw",
        [
          this.database.sales,
          this.database.saleItems,
          this.database.saleItemBatchAllocations,
          this.database.products,
          this.database.inventoryBatches,
          this.database.inventoryMovements,
          this.database.activity_logs,
          this.database.draftCarts,
        ],
        async () => {
          const existingSale = await this.database.sales.where("idempotency_key").equals(request.idempotencyKey).first();
          if (existingSale) return existingSale;

          const draft = await this.database.draftCarts.get("active");
          if (!draft?.items.length) throw new Error("The persisted cart is empty.");
          if (!this.sameCart(draft.items, request.items)) {
            throw new Error("The cart changed before checkout. Review it and try again.");
          }

          const requestedByProduct = this.aggregateRequestedQuantities(request.items);
          const products = new Map<string, Product>();
          const batchesByProduct = new Map<string, readonly InventoryBatch[]>();
          for (const [productId, requestedQuantity] of requestedByProduct) {
            const product = await this.database.products.get(productId);
            if (!product) throw new Error("A product in the cart could not be found.");
            const batches = await this.database.inventoryBatches.where("product_id").equals(productId).toArray();
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
            if (!product || !currentBatches) throw new Error("A product in the cart could not be found.");

            const allocationResult = allocateFifo(currentBatches, cartItem.quantity_base_units);
            const updatedForLine = new Map(allocationResult.allocations.map(allocation => [allocation.batch.id, allocation.batch]));
            const nextBatches = currentBatches.map(batch => updatedForLine.get(batch.id) ?? batch);
            batchesByProduct.set(cartItem.product_id, nextBatches);
            allocationResult.allocations.forEach(allocation => affectedBatches.set(allocation.batch.id, allocation.batch));

            const saleItemId = crypto.randomUUID();
            const subtotalAmount = this.safeMultiply(cartItem.quantity_base_units, cartItem.selling_price_per_unit, "Sale line total is too large.");
            const item: SaleItem = {
              id: saleItemId,
              sale_id: saleId,
              product_id: product.id,
              product_name: cartItem.product_name,
              barcode_scanned: cartItem.barcode,
              quantity_base_units: cartItem.quantity_base_units,
              default_selling_price_per_unit: cartItem.default_selling_price_per_unit,
              selling_price_per_unit: cartItem.selling_price_per_unit,
              subtotal_amount: subtotalAmount,
              total_cost: allocationResult.total_allocated_cost,
              total_profit: subtotalAmount - allocationResult.total_allocated_cost,
            };
            saleItems.push(item);
            totalAmount = this.safeAdd(totalAmount, item.subtotal_amount, "Sale total is too large.");
            totalCost = this.safeAdd(totalCost, item.total_cost, "Sale cost total is too large.");

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
                type: "sale",
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
          const currencySnapshot = request.createCurrencySnapshot(totalAmount, totalCost);
          this.assertCurrencySnapshot(currencySnapshot);
          const sale: Sale = {
            id: saleId,
            date: request.date,
            total_amount: totalAmount,
            total_cost: totalCost,
            total_profit: totalProfit,
            payment_method: "cash",
            operator_id: request.operatorId,
            operator_name: request.operatorName,
            currency_snapshot: currencySnapshot,
            idempotency_key: request.idempotencyKey,
            created_at: request.date,
          };
          const updatedProducts = [...requestedByProduct].map(([productId, requestedQuantity]) => {
            const product = products.get(productId);
            const batches = batchesByProduct.get(productId);
            if (!product || !batches) throw new Error("A product in the cart could not be found.");
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
            total_items_sold: saleItems.reduce((sum, item) => this.safeAdd(sum, item.quantity_base_units, "Sale item quantity is too large."), 0),
            total_amount: sale.total_amount,
            total_cost: sale.total_cost,
            total_profit: sale.total_profit,
            items: saleItems.map(item => ({
              sale_item_id: item.id,
              product_id: item.product_id,
              quantity_base_units: item.quantity_base_units,
              subtotal_amount: item.subtotal_amount,
              total_cost: item.total_cost,
              total_profit: item.total_profit,
            })),
          };
          const activityLog: ActivityLog<"sale_completed"> = {
            id: crypto.randomUUID(),
            event_code: "sale_completed",
            entity_type: "sale",
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
          await this.database.draftCarts.delete("active");
          for (const product of updatedProducts) {
            await this.assertStoredQuantity(product.id, product.quantity);
          }
          return sale;
        }
      );
    } catch (error: unknown) {
      const existingSale = await this.getByIdempotencyKey(request.idempotencyKey);
      if (existingSale) return existingSale;
      throw error;
    }
  }

  async reverseSale(request: ReverseSaleRequest): Promise<Sale> {
    return await this.database.transaction(
      "rw",
      [
        this.database.sales,
        this.database.saleItems,
        this.database.saleItemBatchAllocations,
        this.database.products,
        this.database.inventoryBatches,
        this.database.inventoryMovements,
        this.database.activity_logs,
      ],
      async () => {
        const originalSale = await this.database.sales.get(request.originalSaleId);
        if (!originalSale) throw new Error("The sale could not be found.");
        if (originalSale.reversed) throw new Error("This sale has already been reversed.");
        if (originalSale.original_sale_id) throw new Error("A reversal sale cannot be reversed.");

        // Ensure no newer sale consumed from the same batches
        const originalItems = await this.database.saleItems.where("sale_id").equals(originalSale.id).toArray();
        const originalItemIds = originalItems.map(item => item.id);
        const originalAllocations = originalItemIds.length
          ? await this.database.saleItemBatchAllocations.where("sale_item_id").anyOf(originalItemIds).toArray()
          : [];
        const batchIds = [...new Set(originalAllocations.map(allocation => allocation.batch_id))];

        // Block if any sale exists with a later date
        const latestSale = await this.database.sales.orderBy("date").reverse().first();
        if (latestSale && latestSale.id !== originalSale.id) {
          throw new Error("Only the latest sale can be reversed.");
        }

        // Restore batches
        const restoredBatches = new Map<string, InventoryBatch>();
        for (const allocation of originalAllocations) {
          const batch = await this.database.inventoryBatches.get(allocation.batch_id);
          if (!batch) throw new Error("An inventory batch could not be found.");
          restoredBatches.set(batch.id, {
            ...batch,
            remaining_quantity: this.safeAdd(batch.remaining_quantity, allocation.quantity_consumed, "Inventory quantity is too large."),
            remaining_total_cost: this.safeAdd(batch.remaining_total_cost, allocation.allocated_cost, "Inventory cost is too large."),
          });
        }

        // Restore product quantities
        const productIds = [...new Set(originalItems.map(item => item.product_id))];
        const updatedProducts: Product[] = [];
        for (const productId of productIds) {
          const product = await this.database.products.get(productId);
          if (!product) throw new Error("A product could not be found.");
          const restoredQuantity = originalItems
            .filter(item => item.product_id === productId)
            .reduce((sum, item) => this.safeAdd(sum, item.quantity_base_units, "Product quantity is too large."), 0);
          updatedProducts.push({
            ...product,
            quantity: this.safeAdd(product.quantity, restoredQuantity, "Product quantity is too large."),
            last_modified_by_operator_id: request.operatorId,
            updated_at: request.date,
          });
        }

        // Create reversal sale record (negative values)
        const reversalSaleId = crypto.randomUUID();
        const reversalSale: Sale = {
          ...originalSale,
          id: reversalSaleId,
          date: request.date,
          total_amount: -originalSale.total_amount,
          total_cost: -originalSale.total_cost,
          total_profit: -originalSale.total_profit,
          operator_id: request.operatorId,
          operator_name: request.operatorName,
          idempotency_key: `reversal-${reversalSaleId}`,
          created_at: request.date,
          reversed: false,
          reversal_of_sale_id: null,
          original_sale_id: originalSale.id,
        };

        // Mark original as reversed
        const updatedOriginalSale: Sale = {
          ...originalSale,
          reversed: true,
          reversal_of_sale_id: reversalSaleId,
        };

        // Create movements
        const movements: InventoryMovement[] = [];
        for (const allocation of originalAllocations) {
          const item = originalItems.find(i => i.id === allocation.sale_item_id);
          if (!item) continue;
          movements.push({
            id: crypto.randomUUID(),
            product_id: item.product_id,
            type: "sale_reversal",
            quantity_change: allocation.quantity_consumed,
            batch_id: allocation.batch_id,
            sale_id: reversalSaleId,
            supply_id: null,
            adjustment_id: null,
            operator_id: request.operatorId,
            operator_name: request.operatorName,
            reason: `Reversal of sale ${originalSale.id}`,
            created_at: request.date,
          });
        }

        // Activity log
        const activityLog: ActivityLog<"sale_reversed"> = {
          id: crypto.randomUUID(),
          event_code: "sale_reversed",
          entity_type: "sale",
          entity_id: originalSale.id,
          entity_name_snapshot: null,
          payload: {
            original_sale_id: originalSale.id,
            reversal_sale_id: reversalSaleId,
            total_amount: originalSale.total_amount,
            total_cost: originalSale.total_cost,
            total_profit: originalSale.total_profit,
          },
          operator_id: request.operatorId,
          operator_name: request.operatorName,
          related_sale_id: reversalSaleId,
          related_supply_id: null,
          created_at: request.date,
        };

        // Write everything
        await this.database.sales.put(updatedOriginalSale);
        await this.database.sales.add(reversalSale);
        await this.database.inventoryBatches.bulkPut([...restoredBatches.values()]);
        await this.database.products.bulkPut(updatedProducts);
        await this.database.inventoryMovements.bulkAdd(movements);
        await this.database.activity_logs.add(activityLog);

        // Verify integrity
        for (const product of updatedProducts) {
          await this.assertStoredQuantity(product.id, product.quantity);
        }

        return reversalSale;
      }
    );
  }

  async list(filter: SaleListFilter = {}): Promise<PagedResult<SaleListEntry>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 25;

    const allSales =
      filter.from && filter.to
        ? await this.database.sales.where("date").between(filter.from, filter.to, true, true).reverse().sortBy("date")
        : await this.database.sales.orderBy("date").reverse().toArray();

    const total = allSales.length;
    const pagedSales = allSales.slice((page - 1) * pageSize, page * pageSize);

    if (!pagedSales.length) {
      return createPagedResult([], total, page, pageSize);
    }

    const saleIds = pagedSales.map(sale => sale.id);
    const items = await this.database.saleItems.where("sale_id").anyOf(saleIds).toArray();
    const totals = new Map<string, number>();
    for (const item of items) {
      totals.set(item.sale_id, (totals.get(item.sale_id) ?? 0) + item.quantity_base_units);
    }

    const entries: SaleListEntry[] = pagedSales.map(sale => {
      if (sale.original_sale_id) {
        const originalCount = totals.get(sale.original_sale_id) ?? 0;
        return { sale, totalItemsSold: -originalCount };
      }
      return { sale, totalItemsSold: totals.get(sale.id) ?? 0 };
    });

    return createPagedResult(entries, total, page, pageSize);
  }

  async getDetail(id: string): Promise<SaleDetail | undefined> {
    const sale = await this.database.sales.get(id);
    if (!sale) return undefined;
    const storedItems = await this.database.saleItems.where("sale_id").equals(id).toArray();
    const items = storedItems.map(item => ({
      ...item,
      default_selling_price_per_unit: item.default_selling_price_per_unit ?? item.selling_price_per_unit,
    }));
    const itemIds = items.map(item => item.id);
    const allocations = itemIds.length ? await this.database.saleItemBatchAllocations.where("sale_item_id").anyOf(itemIds).toArray() : [];
    return { sale, items, allocations };
  }

  getByIdempotencyKey(idempotencyKey: string): Promise<Sale | undefined> {
    return this.database.sales.where("idempotency_key").equals(idempotencyKey).first();
  }

  private assertRequest(request: SaleCheckoutRequest): void {
    if (!request.idempotencyKey.trim()) throw new Error("An idempotency key is required.");
    if (!request.operatorId.trim() || !request.operatorName.trim()) throw new Error("An active operator is required.");
    if (!(request.date instanceof Date) || Number.isNaN(request.date.getTime())) throw new Error("A valid sale date is required.");
    if (!request.items.length) throw new Error("The cart is empty.");
    for (const item of request.items) this.assertCartItem(item);
  }

  private assertCurrencySnapshot(snapshot: SaleCurrencySnapshot): void {
    if (!snapshot.primary_code.trim() || !snapshot.secondary_code.trim()) {
      throw new Error("Currency snapshot codes are required.");
    }
    if (!this.isValidPrecision(snapshot.primary_precision) || !this.isValidPrecision(snapshot.secondary_precision)) {
      throw new Error("Currency snapshot precision is invalid.");
    }
    if (snapshot.rate_direction !== "secondary_per_primary") {
      throw new Error("Currency snapshot rate direction is invalid.");
    }
    if (snapshot.rounding_policy !== CURRENCY_ROUNDING_POLICY) {
      throw new Error("Currency snapshot rounding policy is invalid.");
    }
    if (!this.isPositiveDecimal(snapshot.exchange_rate)) {
      throw new Error("Currency snapshot exchange rate is invalid.");
    }
    if (
      !this.isNonNegativeSafeInteger(snapshot.secondary_total_amount) ||
      !this.isNonNegativeSafeInteger(snapshot.secondary_total_cost) ||
      !this.isSafeInteger(snapshot.secondary_total_profit) ||
      snapshot.secondary_total_profit !== snapshot.secondary_total_amount - snapshot.secondary_total_cost
    ) {
      throw new Error("Currency snapshot totals are invalid.");
    }
  }

  private isValidPrecision(value: number): boolean {
    return Number.isSafeInteger(value) && value >= 0;
  }

  private isNonNegativeSafeInteger(value: number): boolean {
    return this.isSafeInteger(value) && value >= 0;
  }

  private isSafeInteger(value: number): boolean {
    return Number.isSafeInteger(value);
  }

  private isPositiveDecimal(value: string): boolean {
    try {
      const rate = new Decimal(value);
      return value.trim().length > 0 && rate.isFinite() && rate.greaterThan(0);
    } catch {
      return false;
    }
  }

  private assertCartItem(item: DraftCartItem): void {
    if (!item.product_id.trim() || !item.product_name.trim()) throw new Error("A cart product is invalid.");
    if (!Number.isSafeInteger(item.multiplier) || item.multiplier <= 0) throw new Error("A cart package multiplier is invalid.");
    if (!Number.isSafeInteger(item.package_quantity) || item.package_quantity <= 0) throw new Error("A cart quantity is invalid.");
    if (!Number.isSafeInteger(item.quantity_base_units) || item.quantity_base_units <= 0) throw new Error("A cart quantity is invalid.");
    if (item.quantity_base_units !== item.package_quantity * item.multiplier) throw new Error("A cart package quantity is inconsistent.");
    if (!Number.isSafeInteger(item.default_selling_price_per_unit) || item.default_selling_price_per_unit <= 0) {
      throw new Error("A cart default selling price is invalid.");
    }
    if (!Number.isSafeInteger(item.selling_price_per_unit) || item.selling_price_per_unit <= 0) throw new Error("A cart selling price is invalid.");
  }

  private aggregateRequestedQuantities(items: readonly DraftCartItem[]): ReadonlyMap<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      const nextQuantity = this.safeAdd(quantities.get(item.product_id) ?? 0, item.quantity_base_units, "Requested product quantity is too large.");
      quantities.set(item.product_id, nextQuantity);
    }
    return quantities;
  }

  private assertInventoryIntegrity(product: Product, batches: readonly InventoryBatch[]): void {
    if (!Number.isSafeInteger(product.quantity) || product.quantity < 0) {
      throw new Error(`Inventory data for '${product.name}' is invalid.`);
    }
    for (const batch of batches) {
      if (
        !Number.isSafeInteger(batch.sequence) ||
        batch.sequence <= 0 ||
        !Number.isSafeInteger(batch.remaining_quantity) ||
        batch.remaining_quantity < 0 ||
        !Number.isSafeInteger(batch.remaining_total_cost) ||
        batch.remaining_total_cost < 0 ||
        (batch.remaining_quantity === 0 && batch.remaining_total_cost !== 0)
      ) {
        console.error(`Inventory integrity failure for product ${product.id}: invalid batch ${batch.id}`);
        throw new Error("Inventory integrity check failed. Checkout is blocked.");
      }
    }
    this.assertBatchQuantity(product.id, batches, product.quantity);
  }

  private assertBatchQuantity(productId: string, batches: readonly InventoryBatch[], expectedQuantity: number): void {
    const actualQuantity = batches.reduce((sum, batch) => this.safeAdd(sum, batch.remaining_quantity, "Inventory quantity is too large."), 0);
    if (actualQuantity !== expectedQuantity) {
      console.error(`Inventory integrity failure for product ${productId}: cached=${expectedQuantity}, batches=${actualQuantity}`);
      throw new Error("Inventory integrity check failed. Checkout is blocked.");
    }
  }

  private async assertStoredQuantity(productId: string, expectedQuantity: number): Promise<void> {
    const batches = await this.database.inventoryBatches.where("product_id").equals(productId).toArray();
    this.assertBatchQuantity(productId, batches, expectedQuantity);
  }

  private sameCart(left: readonly DraftCartItem[], right: readonly DraftCartItem[]): boolean {
    return (
      left.length === right.length &&
      left.every((item, index) => {
        const other = right[index];
        return (
          !!other &&
          item.product_id === other.product_id &&
          item.product_name === other.product_name &&
          item.product_barcode_id === other.product_barcode_id &&
          item.barcode === other.barcode &&
          item.package_type_code === other.package_type_code &&
          item.multiplier === other.multiplier &&
          item.package_quantity === other.package_quantity &&
          item.quantity_base_units === other.quantity_base_units &&
          item.default_selling_price_per_unit === other.default_selling_price_per_unit &&
          item.selling_price_per_unit === other.selling_price_per_unit &&
          item.entry_method === other.entry_method
        );
      })
    );
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
