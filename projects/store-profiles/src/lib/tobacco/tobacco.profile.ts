import { StoreProfile } from '@retail/kernel';

export const TOBACCO_PROFILE: StoreProfile = {
  profile_id: 'tobacco_v1',
  features: {
    dual_currency: true,
    carton_barcodes: true,
    inventory_adjustments: true,
  },
  package_types: [
    { code: 'pocket', multiplier: 1, label_key: 'packages.pocket' },
    { code: 'carton', multiplier: 10, label_key: 'packages.carton' },
  ],
  currency: {
    primary: { code: 'USD', precision: 2, symbol: '$' },
    secondary: { code: 'SYP', precision: 0, symbol: 'SYP' },
  },
  costing: 'fifo',
  default_category_system_code: 'other',
  carton_pricing: 'multiply_pocket',
};
