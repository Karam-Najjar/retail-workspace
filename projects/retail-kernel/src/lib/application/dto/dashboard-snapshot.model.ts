import { ActivityLog } from "../../domain/models/activity-log.model";

export interface DashboardTopProduct {
  readonly product_id: string;
  readonly product_name: string;
  readonly quantity_base_units: number;
}

export interface DashboardWeeklySalesDay {
  readonly date: Date;
  readonly sales_usd: number;
  readonly is_today: boolean;
  readonly is_future: boolean;
}

export interface DashboardInventoryHealth {
  readonly in_stock: number;
  readonly low_stock: number;
  readonly out_of_stock: number;
}

export interface DashboardSnapshot {
  readonly total_products: number;
  readonly active_products: number;
  readonly today_sales_usd: number;
  readonly today_sales_syp: number;
  readonly today_profit_usd: number;
  readonly today_profit_syp: number;
  readonly month_sales_usd: number;
  readonly month_sales_syp: number;
  readonly month_profit_usd: number;
  readonly month_profit_syp: number;
  readonly weekly_sales: readonly DashboardWeeklySalesDay[];
  readonly inventory_health: DashboardInventoryHealth;
  readonly low_stock_products: readonly { readonly id: string; readonly name: string; readonly quantity: number }[];
  readonly recent_activity: readonly ActivityLog[];
  readonly top_products: readonly DashboardTopProduct[];
}
