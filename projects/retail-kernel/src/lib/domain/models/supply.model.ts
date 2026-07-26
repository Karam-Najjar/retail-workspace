import { SupplyCurrencySnapshot } from './supply-currency-snapshot.model';

export interface Supply {
  readonly id: string;
  readonly date: Date;
  readonly supplier_id: string;
  readonly supplier_name: string;
  readonly total_cost: number;
  readonly operator_id: string;
  readonly operator_name: string;
  readonly currency_snapshot: SupplyCurrencySnapshot;
  readonly created_at: Date;
}
