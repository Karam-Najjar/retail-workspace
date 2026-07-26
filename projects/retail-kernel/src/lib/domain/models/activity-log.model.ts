export interface ActivityLog<TPayload = unknown> {
  readonly id: string;
  readonly event_code: string;
  readonly entity_type: string | null;
  readonly entity_id: string | null;
  readonly entity_name_snapshot: string | null;
  readonly payload: TPayload;
  readonly operator_id: string;
  readonly operator_name: string;
  readonly related_sale_id: string | null;
  readonly related_supply_id: string | null;
  readonly created_at: Date;
}
