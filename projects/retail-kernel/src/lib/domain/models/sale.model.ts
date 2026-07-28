import { SaleCurrencySnapshot } from "./sale-currency-snapshot.model";

export type SalePaymentMethod = "cash";

export interface Sale {
  readonly id: string;
  readonly date: Date;
  readonly total_amount: number;
  readonly total_cost: number;
  readonly total_profit: number;
  readonly payment_method: SalePaymentMethod;
  readonly operator_id: string;
  readonly operator_name: string;
  readonly currency_snapshot: SaleCurrencySnapshot;
  readonly idempotency_key: string;
  readonly created_at: Date;
}
