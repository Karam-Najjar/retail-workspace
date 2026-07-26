export interface Category {
  readonly id: string;
  readonly name: string;
  readonly system_code: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}
