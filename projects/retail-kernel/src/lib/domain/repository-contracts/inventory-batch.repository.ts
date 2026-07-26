import { InventoryBatch } from '../models/inventory-batch.model';

export interface InventoryBatchRepository {
  listByProduct(productId: string): Promise<readonly InventoryBatch[]>;
  sumRemainingQuantity(productId: string): Promise<number>;
}
