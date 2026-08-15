export interface InventoryValuationItem {
  readonly product_id: string;
  readonly product_name: string;
  readonly quantity: number;
  readonly latest_unit_cost: number;
  readonly total_value: number;
}

export interface InventoryValuation {
  readonly items: readonly InventoryValuationItem[];
  readonly total_units: number;
  readonly total_value: number;
}