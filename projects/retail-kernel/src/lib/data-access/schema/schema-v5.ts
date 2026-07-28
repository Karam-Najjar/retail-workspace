import { SCHEMA_V4 } from "./schema-v4";

export const SCHEMA_V5 = {
  ...SCHEMA_V4,
  inventoryBatches: "id, product_id, source_id, source_type, &[product_id+sequence]",
  inventoryMovements: "id, product_id, batch_id, sale_id, supply_id, adjustment_id, created_at, [product_id+created_at]",
  inventoryAdjustments: "id, product_id, type, date, created_at, [product_id+date]",
} as const;
