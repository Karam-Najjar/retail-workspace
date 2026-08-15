import { InventoryAdjustmentType } from "./inventory-adjustment.model";

export type InventoryMovementType = InventoryAdjustmentType | "supply" | "sale" | "sale_reversal";

export interface InventoryMovement {
  readonly id: string;
  readonly product_id: string;
  readonly type: InventoryMovementType;
  readonly quantity_change: number;
  readonly batch_id: string | null;
  readonly sale_id: string | null;
  readonly supply_id: string | null;
  readonly adjustment_id: string | null;
  readonly operator_id: string;
  readonly operator_name: string;
  readonly reason: string | null;
  readonly created_at: Date;
}
