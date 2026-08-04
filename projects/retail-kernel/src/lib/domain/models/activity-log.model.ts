import { BackupImportedPayload } from "../events/backup-event.payload";
import {
  InventoryStockAddedEventPayload,
  InventoryStockRemovedEventPayload,
  InventoryWriteOffEventPayload,
} from "../events/inventory-event.payload";
import { ProductEventPayload } from "../events/product-event.payload";
import { SaleCompletedPayload } from "../events/sale-completed.payload";
import { DataClearedPayload, SettingsUpdatedPayload } from "../events/settings-event.payload";
import { SupplyReceivedPayload } from "../events/supply-received.payload";

export interface CategoryDeletedPayload {
  readonly affected_products: number;
}

export interface ProductDeletedPayload {
  readonly barcode_count: number;
}

export interface SupplierDeletedPayload {
  readonly affected_supplies: number;
}

export interface ActivityEventPayloadMap {
  readonly backup_imported: BackupImportedPayload;
  readonly "category.deleted": CategoryDeletedPayload;
  readonly "data.cleared": DataClearedPayload;
  readonly "inventory.opening_balance.created": InventoryStockAddedEventPayload;
  readonly "inventory.product.written_off": InventoryWriteOffEventPayload;
  readonly "inventory.stock.added": InventoryStockAddedEventPayload;
  readonly "inventory.stock.removed": InventoryStockRemovedEventPayload;
  readonly "product.created": ProductEventPayload;
  readonly "product.deleted": ProductDeletedPayload;
  readonly product_created: ProductEventPayload;
  readonly sale_completed: SaleCompletedPayload;
  readonly "settings.updated": SettingsUpdatedPayload;
  readonly "supplier.deleted": SupplierDeletedPayload;
  readonly "supply.received": SupplyReceivedPayload;
}

export type ActivityEventCode = keyof ActivityEventPayloadMap;

interface ActivityLogEntry<TCode extends ActivityEventCode> {
  readonly id: string;
  readonly event_code: TCode;
  readonly entity_type: string | null;
  readonly entity_id: string | null;
  readonly entity_name_snapshot: string | null;
  readonly payload: ActivityEventPayloadMap[TCode];
  readonly operator_id: string;
  readonly operator_name: string;
  readonly related_sale_id: string | null;
  readonly related_supply_id: string | null;
  readonly created_at: Date;
}

export type ActivityLog<TCode extends ActivityEventCode = ActivityEventCode> = {
  readonly [TCurrentCode in TCode]: ActivityLogEntry<TCurrentCode>;
}[TCode];
