export type DraftCartEntryMethod = "scan" | "search";

export interface DraftCartItem {
  readonly product_id: string;
  readonly product_name: string;
  readonly product_barcode_id: string | null;
  readonly barcode: string | null;
  readonly package_type_code: string | null;
  readonly multiplier: number;
  readonly package_quantity: number;
  readonly quantity_base_units: number;
  readonly selling_price_per_unit: number;
  readonly entry_method: DraftCartEntryMethod;
}
