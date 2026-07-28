export type InventoryBatchSourceType = "opening_balance" | "supply" | "adjustment";

export interface InventoryBatch {
  readonly id: string;
  readonly product_id: string;
  readonly source_type: InventoryBatchSourceType;
  readonly source_id: string;
  readonly original_quantity: number;
  readonly remaining_quantity: number;
  readonly original_total_cost: number;
  readonly remaining_total_cost: number;
  readonly unit_cost_display: string;
  readonly sequence: number;
  readonly created_at: Date;
}
