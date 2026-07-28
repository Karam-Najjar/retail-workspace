export interface SaleCurrencySnapshot {
  readonly primary_code: string;
  readonly primary_precision: number;
  readonly secondary_code: string;
  readonly secondary_precision: number;
  readonly exchange_rate: string;
  readonly rate_direction: "secondary_per_primary";
  readonly rounding_policy: string;
  readonly secondary_total_amount: number;
  readonly secondary_total_cost: number;
  readonly secondary_total_profit: number;
}
