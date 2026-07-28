import { SCHEMA_V7 } from "./schema-v7";

export const SCHEMA_V8 = {
  ...SCHEMA_V7,
  sales: "id, date, operator_id, &idempotency_key, created_at",
  saleItems: "id, sale_id, product_id, [sale_id+product_id]",
  saleItemBatchAllocations: "id, sale_item_id, batch_id",
} as const;
