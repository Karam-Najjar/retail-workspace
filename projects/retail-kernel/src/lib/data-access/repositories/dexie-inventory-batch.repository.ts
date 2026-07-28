import { inject, Injectable } from "@angular/core";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
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
    return batches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
  }
}
