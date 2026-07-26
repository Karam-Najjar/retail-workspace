import { inject, Injectable } from '@angular/core';
import { Supply } from '../../domain/models/supply.model';
import { Product } from '../../domain/models/product.model';
import { SupplyDetail, SupplyListFilter, SupplyReceipt, SupplyRepository } from '../../domain/repository-contracts/supply.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieSupplyRepository implements SupplyRepository {
  private readonly database = inject(RetailDatabase);

  receive(receipt: SupplyReceipt): Promise<void> {
    return this.database.transaction('rw', [this.database.suppliers, this.database.supplies, this.database.supplyItems, this.database.products, this.database.inventoryBatches, this.database.inventoryMovements, this.database.activity_logs], async () => {
      const supplier = await this.database.suppliers.get(receipt.supply.supplier_id);
      if (!supplier) throw new Error('Supplier could not be found.');

      const products = new Map<string, Product>();
      const sequences = new Map<string, number>();
      const quantityChanges = new Map<string, number>();
      for (const entry of receipt.entries) {
        if (!products.has(entry.product.id)) {
          const storedProduct = await this.database.products.get(entry.product.id);
          if (!storedProduct) throw new Error(`Product '${entry.product.name}' could not be found.`);
          if (storedProduct.quantity !== entry.product.quantity) throw new Error(`Stock changed for '${storedProduct.name}'. Reload and try again.`);
          await this.assertQuantity(storedProduct.id, storedProduct.quantity);
          products.set(storedProduct.id, storedProduct);
          const batches = await this.database.inventoryBatches.where('product_id').equals(storedProduct.id).toArray();
          sequences.set(storedProduct.id, batches.reduce((maximum, batch) => Math.max(maximum, batch.sequence), 0));
        }
      }

      const batches = receipt.entries.map((entry) => {
        const sequence = (sequences.get(entry.product.id) ?? 0) + 1;
        sequences.set(entry.product.id, sequence);
        quantityChanges.set(entry.product.id, (quantityChanges.get(entry.product.id) ?? 0) + entry.item.quantity_base_units);
        return { ...entry.batch, sequence };
      });
      const updatedProducts = [...products.values()].map((product) => ({ ...product, quantity: product.quantity + (quantityChanges.get(product.id) ?? 0), last_modified_by_operator_id: receipt.supply.operator_id, updated_at: receipt.supply.created_at }));

      await this.database.supplies.add(receipt.supply);
      await this.database.supplyItems.bulkAdd(receipt.entries.map((entry) => entry.item));
      await this.database.inventoryBatches.bulkAdd(batches);
      await this.database.inventoryMovements.bulkAdd(receipt.entries.map((entry) => entry.movement));
      await this.database.products.bulkPut(updatedProducts);
      await this.database.activity_logs.add(receipt.activityLog);
      for (const product of updatedProducts) await this.assertQuantity(product.id, product.quantity);
    });
  }

  async list(filter: SupplyListFilter = {}): Promise<readonly Supply[]> {
    const supplies = filter.from && filter.to
      ? await this.database.supplies.where('date').between(filter.from, filter.to, true, true).reverse().sortBy('date')
      : await this.database.supplies.orderBy('date').reverse().toArray();
    return supplies.filter((supply) => !filter.supplierId || supply.supplier_id === filter.supplierId);
  }

  async getDetail(id: string): Promise<SupplyDetail | undefined> {
    const supply = await this.database.supplies.get(id);
    if (!supply) return undefined;
    return { supply, items: await this.database.supplyItems.where('supply_id').equals(id).toArray() };
  }

  async listRecentBySupplier(supplierId: string, limit = 10): Promise<readonly Supply[]> {
    const supplies = await this.database.supplies.where('supplier_id').equals(supplierId).toArray();
    return supplies.sort((left, right) => right.date.getTime() - left.date.getTime()).slice(0, limit);
  }

  private async assertQuantity(productId: string, expected: number): Promise<void> {
    const batches = await this.database.inventoryBatches.where('product_id').equals(productId).toArray();
    const actual = batches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
    if (actual !== expected) {
      console.error(`Inventory integrity failure for product ${productId}: cached=${expected}, batches=${actual}`);
      throw new Error('Inventory integrity check failed. Supply receiving is blocked.');
    }
  }
}
