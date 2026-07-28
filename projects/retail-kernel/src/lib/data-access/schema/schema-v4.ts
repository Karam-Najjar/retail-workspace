import { SCHEMA_V3 } from "../database/schema/schema-v3";

export const SCHEMA_V4 = {
  ...SCHEMA_V3,
  products: "id, name, category_id, [category_id+name]",
  productBarcodes: "id, product_id, &normalized_barcode",
} as const;
