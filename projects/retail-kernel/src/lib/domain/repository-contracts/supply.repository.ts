import { ActivityLog } from "../models/activity-log.model";
import { InventoryBatch } from "../models/inventory-batch.model";
import { InventoryMovement } from "../models/inventory-movement.model";
import { Product } from "../models/product.model";
import { SupplyItem } from "../models/supply-item.model";
import { Supply } from "../models/supply.model";

export interface SupplyListFilter {
  readonly supplierId?: string;
  readonly from?: Date;
  readonly to?: Date;
}

export interface SupplyReceiptEntry {
  readonly product: Product;
  readonly item: SupplyItem;
  readonly batch: Omit<InventoryBatch, "sequence">;
  readonly movement: InventoryMovement;
}

export interface SupplyReceipt {
  readonly supply: Supply;
  readonly entries: readonly SupplyReceiptEntry[];
  readonly activityLog: ActivityLog;
}

export interface SupplyDetail {
  readonly supply: Supply;
  readonly items: readonly SupplyItem[];
}

export interface SupplyRepository {
  receive(receipt: SupplyReceipt): Promise<void>;
  list(filter?: SupplyListFilter): Promise<readonly Supply[]>;
  listDetails(filter?: SupplyListFilter): Promise<readonly SupplyDetail[]>;
  getDetail(id: string): Promise<SupplyDetail | undefined>;
  listRecentBySupplier(supplierId: string, limit?: number): Promise<readonly Supply[]>;
}
