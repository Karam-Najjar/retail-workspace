import { ActivityLog } from '../models/activity-log.model';
import { InventoryAdjustment } from '../models/inventory-adjustment.model';
import { InventoryBatch } from '../models/inventory-batch.model';
import { InventoryMovement } from '../models/inventory-movement.model';
import { Product } from '../models/product.model';

export interface PositiveInventoryChange {
  readonly product: Product;
  readonly adjustment: InventoryAdjustment;
  readonly batch: Omit<InventoryBatch, 'sequence'>;
  readonly movement: InventoryMovement;
  readonly activityLog: ActivityLog;
}

export interface NegativeInventoryChange {
  readonly product: Product;
  readonly adjustment: InventoryAdjustment;
  readonly quantity: number;
  readonly activityLog: ActivityLog;
}

export interface InventoryAdjustmentRepository {
  applyPositive(change: PositiveInventoryChange): Promise<InventoryBatch>;
  applyNegative(change: NegativeInventoryChange): Promise<readonly InventoryMovement[]>;
  writeOffAndDelete(change: NegativeInventoryChange): Promise<readonly InventoryMovement[]>;
}
