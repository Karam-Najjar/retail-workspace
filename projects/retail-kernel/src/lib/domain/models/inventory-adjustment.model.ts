export type InventoryAdjustmentType = 'opening_balance' | 'adjustment_in' | 'adjustment_out' | 'write_off';

export interface InventoryAdjustment {
  readonly id: string;
  readonly date: Date;
  readonly type: InventoryAdjustmentType;
  readonly product_id: string;
  readonly quantity_change: number;
  readonly unit_cost: string | null;
  readonly operator_id: string;
  readonly operator_name: string;
  readonly reason: string | null;
  readonly created_at: Date;
}
