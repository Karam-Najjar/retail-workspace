export interface InventoryStockAddedEventPayload {
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_cost_cents: number;
  readonly total_cost_cents: number;
  readonly adjustment_id: string;
  readonly batch_id: string;
}

export interface InventoryStockRemovedEventPayload {
  readonly product_id: string;
  readonly quantity: number;
  readonly adjustment_id: string;
}

export interface InventoryWriteOffEventPayload {
  readonly product_id: string;
  readonly quantity: number;
  readonly adjustment_id: string;
  readonly reason: string;
}
