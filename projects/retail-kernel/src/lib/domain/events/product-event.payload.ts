export interface ProductEventPayload {
  readonly product_id: string;
  readonly name: string;
  readonly category_id: string;
}

export interface ProductDeletedEventPayload extends ProductEventPayload {
  readonly barcode_count: number;
}
