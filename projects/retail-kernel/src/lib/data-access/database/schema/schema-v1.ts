export const SCHEMA_V1 = {
  operators: 'id, slot',
  settings: '_singleton_key',
  activity_logs: 'id, event_code, entity_type, entity_id, operator_id, created_at',
  licence_state: 'id',
  app_metadata: 'key',
} as const;
