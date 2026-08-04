import { inject, Injectable } from "@angular/core";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
import { assertValidInventoryBatch, checkedAddSafeIntegers } from "../../domain/policies/fifo-allocation.policy";
import { InventoryBatchRepository } from "../../domain/repository-contracts/inventory-batch.repository";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieInventoryBatchRepository implements InventoryBatchRepository {
  private readonly database = inject(RetailDatabase);

  async listByProduct(productId: string): Promise<readonly InventoryBatch[]> {
    const batches = await this.database.inventoryBatches.where("product_id").equals(productId).toArray();
    return batches.sort((left, right) => left.sequence - right.sequence);
  }

  async sumRemainingQuantity(productId: string): Promise<number> {
    const batches = await this.database.inventoryBatches.where("product_id").equals(productId).toArray();
    for (const batch of batches) assertValidInventoryBatch(batch);
    return batches.reduce(
      (sum, batch) => checkedAddSafeIntegers(sum, batch.remaining_quantity, "Inventory quantity is too large."),
      0
    );
  }
}
