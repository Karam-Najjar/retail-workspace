import { inject, Injectable } from "@angular/core";
import { DashboardSnapshot } from "../dto/dashboard-snapshot.model";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { liveQuery } from "dexie";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class DashboardQueryService {
  private readonly db = inject(RetailDatabase);

  async getSnapshot(now = new Date()): Promise<DashboardSnapshot> {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const [settings, sales, products, activity, items] = await Promise.all([
      this.db.settings.get("app"),
      this.db.sales.where("date").aboveOrEqual(month).toArray(),
      this.db.products.toArray(),
      this.db.activity_logs.orderBy("created_at").reverse().limit(5).toArray(),
      this.db.saleItems.toArray(),
    ]);
    const rate = this.parseRate(settings?.currency_rate);
    const todaySales = sales.filter(sale => sale.date >= today).reduce((sum, sale) => sum + sale.total_amount, 0);
    const monthSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const monthProfit = sales.reduce((sum, sale) => sum + sale.total_profit, 0);
    const names = new Map(products.map(product => [product.id, product.name]));
    const grouped = new Map<string, number>();
    for (const item of items) grouped.set(item.product_id, (grouped.get(item.product_id) ?? 0) + item.quantity_base_units);
    const topProducts = [...grouped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product_id, quantity_base_units]) => ({ product_id, product_name: names.get(product_id) ?? product_id, quantity_base_units }));
    return {
      today_sales_usd: todaySales,
      today_sales_syp: Math.round(todaySales * rate),
      month_sales_usd: monthSales,
      month_sales_syp: Math.round(monthSales * rate),
      month_profit_usd: monthProfit,
      month_profit_syp: Math.round(monthProfit * rate),
      low_stock_products: products
        .filter(product => product.quantity <= (settings?.low_stock_threshold ?? 0))
        .map(({ id, name, quantity }) => ({ id, name, quantity })),
      recent_activity: activity,
      top_products: topProducts,
    };
  }

  watch(): Observable<DashboardSnapshot> {
    return liveQuery(() => this.getSnapshot()) as unknown as Observable<DashboardSnapshot>;
  }
  private parseRate(value: string | undefined): number {
    const rate = Number(value ?? 1);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  }
}
