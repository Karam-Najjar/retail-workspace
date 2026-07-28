import { SCHEMA_V2 } from "./schema-v2";

export const SCHEMA_V3 = {
  ...SCHEMA_V2,
  suppliers: "id, name",
} as const;
