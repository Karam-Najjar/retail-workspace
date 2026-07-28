export interface StorePackageType {
  readonly code: string;
  readonly multiplier: number;
  readonly label_key: string;
}

export interface StoreCurrency {
  readonly code: string;
  readonly precision: number;
  readonly symbol: string;
}

export interface StoreProfile {
  readonly profile_id: string;
  readonly features: Readonly<Record<string, boolean>>;
  readonly package_types: readonly StorePackageType[];
  readonly currency: {
    readonly primary: StoreCurrency;
    readonly secondary: StoreCurrency;
  };
  readonly costing: "fifo";
  readonly default_category_system_code: string;
  readonly carton_pricing: "multiply_pocket";
}
