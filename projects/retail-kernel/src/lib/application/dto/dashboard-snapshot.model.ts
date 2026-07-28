import { ActivityLog } from "../../domain/models/activity-log.model";

export interface DashboardTopProduct {
  readonly product_id: string;
  readonly product_name: string;
  readonly quantity_base_units: number;
}

export interface DashboardSnapshot {
  readonly today_sales_usd: number;
  readonly today_sales_syp: number;
  readonly month_sales_usd: number;
  readonly month_sales_syp: number;
  readonly month_profit_usd: number;
  readonly month_profit_syp: number;
  readonly low_stock_products: readonly { readonly id: string; readonly name: string; readonly quantity: number }[];
  readonly recent_activity: readonly ActivityLog[];
  readonly top_products: readonly DashboardTopProduct[];
}
