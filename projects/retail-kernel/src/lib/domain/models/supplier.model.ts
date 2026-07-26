export interface Supplier {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly notes: string;
  readonly created_by_operator_id: string;
  readonly last_modified_by_operator_id: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}
