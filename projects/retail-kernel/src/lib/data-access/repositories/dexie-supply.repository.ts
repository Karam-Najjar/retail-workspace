import { inject, Injectable } from "@angular/core";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
import { Supply } from "../../domain/models/supply.model";
import { Product } from "../../domain/models/product.model";
import { SupplyDetail, SupplyListFilter, SupplyReceipt, SupplyRepository } from "../../domain/repository-contracts/supply.repository";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieSupplyRepository implements SupplyRepository {
  private readonly database = inject(RetailDatabase);

  receive(receipt: SupplyReceipt): Promise<void> {
    return this.database.transaction(
      "rw",
      [
        this.database.suppliers,
        this.database.supplies,
        this.database.supplyItems,
        this.database.products,
        this.database.inventoryBatches,
        this.database.inventoryMovements,
        this.database.activity_logs,
      ],
      async () => {
        const supplier = await this.database.suppliers.get(receipt.supply.supplier_id);
        if (!supplier) throw new Error("Supplier could not be found.");

        const products = new Map<string, Product>();
        const sequences = new Map<string, number>();
        const quantityChanges = new Map<string, number>();
        for (const entry of receipt.entries) {
          if (!products.has(entry.product.id)) {
            const storedProduct = await this.database.products.get(entry.product.id);
            if (!storedProduct) throw new Error(`Product '${entry.product.name}' could not be found.`);
            if (storedProduct.quantity !== entry.product.quantity)
              throw new Error(`Stock changed for '${storedProduct.name}'. Reload and try again.`);
            const batches = await this.database.inventoryBatches.where("product_id").equals(storedProduct.id).toArray();
            this.assertQuantity(storedProduct.id, storedProduct.quantity, batches);
            products.set(storedProduct.id, storedProduct);
            sequences.set(
              storedProduct.id,
              batches.reduce((maximum, batch) => Math.max(maximum, batch.sequence), 0)
            );
          }
        }

        const batches = receipt.entries.map(entry => {
          const sequence = this.checkedAdd(sequences.get(entry.product.id) ?? 0, 1, "Inventory batch sequence is too large.");
          sequences.set(entry.product.id, sequence);
          quantityChanges.set(
            entry.product.id,
            this.checkedAdd(
              quantityChanges.get(entry.product.id) ?? 0,
              entry.item.quantity_base_units,
              "Received product quantity is too large."
            )
          );
          return { ...entry.batch, sequence };
        });
        const updatedProducts = [...products.values()].map(product => ({
          ...product,
          quantity: this.checkedAdd(product.quantity, quantityChanges.get(product.id) ?? 0, "Product quantity is too large."),
          last_modified_by_operator_id: receipt.supply.operator_id,
          updated_at: receipt.supply.created_at,
        }));

        await this.database.supplies.add(receipt.supply);
        await this.database.supplyItems.bulkAdd(receipt.entries.map(entry => entry.item));
        await this.database.inventoryBatches.bulkAdd(batches);
        await this.database.inventoryMovements.bulkAdd(receipt.entries.map(entry => entry.movement));
        await this.database.products.bulkPut(updatedProducts);
        await this.database.activity_logs.add(receipt.activityLog);
        for (const product of updatedProducts) {
          const storedBatches = await this.database.inventoryBatches.where("product_id").equals(product.id).toArray();
          this.assertQuantity(product.id, product.quantity, storedBatches);
        }
      }
    );
  }

  async list(filter: SupplyListFilter = {}): Promise<readonly Supply[]> {
    return this.listSupplies(filter);
  }

  async listDetails(filter: SupplyListFilter = {}): Promise<readonly SupplyDetail[]> {
    return this.database.transaction("r", [this.database.supplies, this.database.supplyItems], async () => {
      const supplies = await this.listSupplies(filter);
      if (!supplies.length) return [];

      const supplyIds = supplies.map(supply => supply.id);
      const items = await this.database.supplyItems.where("supply_id").anyOf(supplyIds).toArray();
      const itemsBySupplyId = new Map<string, SupplyDetail["items"]>();
      for (const item of items) {
        const current = itemsBySupplyId.get(item.supply_id) ?? [];
        itemsBySupplyId.set(item.supply_id, [...current, item]);
      }
      return supplies.map(supply => ({ supply, items: itemsBySupplyId.get(supply.id) ?? [] }));
    });
  }

  private async listSupplies(filter: SupplyListFilter): Promise<readonly Supply[]> {
    const supplies =
      filter.from && filter.to
        ? await this.database.supplies.where("date").between(filter.from, filter.to, true, true).reverse().sortBy("date")
        : await this.database.supplies.orderBy("date").reverse().toArray();
    return supplies.filter(supply => !filter.supplierId || supply.supplier_id === filter.supplierId);
  }

  async getDetail(id: string): Promise<SupplyDetail | undefined> {
    const supply = await this.database.supplies.get(id);
    if (!supply) return undefined;
    return { supply, items: await this.database.supplyItems.where("supply_id").equals(id).toArray() };
  }

  async listRecentBySupplier(supplierId: string, limit = 10): Promise<readonly Supply[]> {
    const supplies = await this.database.supplies.where("supplier_id").equals(supplierId).toArray();
    return supplies.sort((left, right) => right.date.getTime() - left.date.getTime()).slice(0, limit);
  }

  private assertQuantity(productId: string, expected: number, batches: readonly InventoryBatch[]): void {
    if (!Number.isSafeInteger(expected) || expected < 0) {
      console.error(`Inventory integrity failure for product ${productId}: invalid cached quantity ${expected}`);
      throw new Error("Inventory integrity check failed. Supply receiving is blocked.");
    }
    for (const batch of batches) this.assertValidBatch(productId, batch);
    const actual = batches.reduce(
      (sum, batch) => this.checkedAdd(sum, batch.remaining_quantity, "Inventory quantity is too large."),
      0
    );
    if (actual !== expected) {
      console.error(`Inventory integrity failure for product ${productId}: cached=${expected}, batches=${actual}`);
      throw new Error("Inventory integrity check failed. Supply receiving is blocked.");
    }
  }

  private assertValidBatch(productId: string, batch: InventoryBatch): void {
    if (
      !Number.isSafeInteger(batch.sequence) ||
      batch.sequence <= 0 ||
      !Number.isSafeInteger(batch.original_quantity) ||
      batch.original_quantity <= 0 ||
      !Number.isSafeInteger(batch.remaining_quantity) ||
      batch.remaining_quantity < 0 ||
      batch.remaining_quantity > batch.original_quantity ||
      !Number.isSafeInteger(batch.original_total_cost) ||
      batch.original_total_cost < 0 ||
      !Number.isSafeInteger(batch.remaining_total_cost) ||
      batch.remaining_total_cost < 0 ||
      batch.remaining_total_cost > batch.original_total_cost ||
      (batch.remaining_quantity === 0 && batch.remaining_total_cost !== 0)
    ) {
      console.error(`Inventory integrity failure for product ${productId}: invalid batch ${batch.id}`);
      throw new Error("Inventory integrity check failed. Supply receiving is blocked.");
    }
  }

  private checkedAdd(left: number, right: number, message: string): number {
    if (!Number.isSafeInteger(left) || left < 0 || !Number.isSafeInteger(right) || right < 0) throw new Error(message);
    const result = left + right;
    if (!Number.isSafeInteger(result)) throw new Error(message);
    return result;
  }
}
