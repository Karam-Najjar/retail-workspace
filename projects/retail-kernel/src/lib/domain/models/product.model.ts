export interface Product {
  readonly id: string;
  readonly name: string;
  readonly selling_price: number;
  readonly quantity: number;
  readonly category_id: string;
  readonly created_by_operator_id: string;
  readonly last_modified_by_operator_id: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}
