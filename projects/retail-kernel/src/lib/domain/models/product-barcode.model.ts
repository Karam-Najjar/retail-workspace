export interface ProductBarcode {
  readonly id: string;
  readonly product_id: string;
  readonly barcode: string;
  readonly normalized_barcode: string;
  readonly package_type_code: string;
  readonly multiplier: number;
}
