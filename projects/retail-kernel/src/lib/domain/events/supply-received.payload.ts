export interface SupplyReceivedLinePayload {
  readonly supply_item_id: string;
  readonly product_id: string;
  readonly quantity_base_units: number;
  readonly subtotal_cost: number;
  readonly batch_id: string;
}

export interface SupplyReceivedPayload {
  readonly supply_id: string;
  readonly supplier_id: string;
  readonly item_count: number;
  readonly total_cost: number;
  readonly lines: readonly SupplyReceivedLinePayload[];
}
