export interface Supplier {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly notes: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}
