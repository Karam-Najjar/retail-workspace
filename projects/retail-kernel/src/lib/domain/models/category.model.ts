export interface Category {
  readonly id: string;
  readonly name: string;
  readonly system_code: string | null;
  readonly created_by_operator_id: string;
  readonly last_modified_by_operator_id: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}
