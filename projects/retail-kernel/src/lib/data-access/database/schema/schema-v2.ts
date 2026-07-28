import { SCHEMA_V1 } from "./schema-v1";

export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  categories: "id, system_code, name",
} as const;
