export interface SaleItem {
  readonly id: string;
  readonly sale_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly barcode_scanned: string | null;
  readonly quantity_base_units: number;
  readonly selling_price_per_unit: number;
  readonly subtotal_amount: number;
  readonly total_cost: number;
  readonly total_profit: number;
}
