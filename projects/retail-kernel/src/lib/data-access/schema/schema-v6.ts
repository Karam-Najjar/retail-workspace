import { SCHEMA_V5 } from "./schema-v5";

export const SCHEMA_V6 = {
  ...SCHEMA_V5,
  supplies: "id, date, supplier_id, operator_id, created_at, [supplier_id+date]",
  supplyItems: "id, supply_id, product_id, package_type_code, [supply_id+product_id]",
} as const;
