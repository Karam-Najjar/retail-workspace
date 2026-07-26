export interface SaleCompletedItemPayload {
  readonly sale_item_id: string;
  readonly product_id: string;
  readonly quantity_base_units: number;
  readonly subtotal_amount: number;
  readonly total_cost: number;
  readonly total_profit: number;
}

export interface SaleCompletedPayload {
  readonly sale_id: string;
  readonly item_count: number;
  readonly total_items_sold: number;
  readonly total_amount: number;
  readonly total_cost: number;
  readonly total_profit: number;
  readonly items: readonly SaleCompletedItemPayload[];
}
