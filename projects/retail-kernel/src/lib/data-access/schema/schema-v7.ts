import { SCHEMA_V6 } from './schema-v6';

export const SCHEMA_V7 = {
  ...SCHEMA_V6,
  draftCarts: 'id, updated_at',
} as const;
