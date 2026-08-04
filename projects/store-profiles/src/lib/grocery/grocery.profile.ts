import { StoreProfile } from "@retail/kernel";

export const GROCERY_PROFILE: StoreProfile = {
  profile_id: "grocery_v1",
  features: {
    dual_currency: true,
    carton_barcodes: false,
    inventory_adjustments: true,
  },
  package_types: [
    { code: "unit", multiplier: 1, label_key: "packages.unit" },
    { code: "case", multiplier: 12, label_key: "packages.case" },
  ],
  currency: {
    primary: { code: "USD", precision: 2, symbol: "$" },
    secondary: { code: "SYP", precision: 0, symbol: "SYP" },
  },
  costing: "fifo",
  default_category_system_code: "other",
  carton_pricing: "multiply_pocket",
};
