export interface SaleItemBatchAllocation {
  readonly id: string;
  readonly sale_item_id: string;
  readonly batch_id: string;
  readonly quantity_consumed: number;
  readonly allocated_cost: number;
}
