import { inject, Injectable } from "@angular/core";
import { DashboardSnapshot, DashboardWeeklySalesDay } from "../dto/dashboard-snapshot.model";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { liveQuery } from "dexie";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class DashboardQueryService {
  private readonly db = inject(RetailDatabase);

  async getSnapshot(now = new Date()): Promise<DashboardSnapshot> {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = this.addDays(today, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = this.addDays(today, -((today.getDay() + 6) % 7));
    const salesRangeStart = weekStart < monthStart ? weekStart : monthStart;
    const [settings, sales, products, activity] = await Promise.all([
      this.db.settings.get("app"),
      this.db.sales.where("date").between(salesRangeStart, tomorrow, true, false).toArray(),
      this.db.products.toArray(),
      this.db.activity_logs.orderBy("created_at").reverse().limit(5).toArray(),
    ]);
    const eligibleSales = sales.filter(sale => sale.date <= now);
    const todaySales = eligibleSales.filter(sale => this.isWithin(sale.date, today, tomorrow));
    const monthSales = eligibleSales.filter(sale => this.isWithin(sale.date, monthStart, tomorrow));
    const monthSaleIds = monthSales.map(sale => sale.id);
    const monthItems = monthSaleIds.length > 0 ? await this.db.saleItems.where("sale_id").anyOf(monthSaleIds).toArray() : [];

    const names = new Map(products.map(product => [product.id, product.name]));
    const saleTimes = new Map(monthSales.map(sale => [sale.id, sale.date.getTime()]));
    const grouped = new Map<string, { quantity: number; latest_name: string; latest_sale_time: number }>();
    for (const item of monthItems) {
      const saleTime = saleTimes.get(item.sale_id) ?? Number.NEGATIVE_INFINITY;
      const current = grouped.get(item.product_id);
      grouped.set(item.product_id, {
        quantity: (current?.quantity ?? 0) + item.quantity_base_units,
        latest_name: current === undefined || saleTime >= current.latest_sale_time ? item.product_name : current.latest_name,
        latest_sale_time: Math.max(current?.latest_sale_time ?? Number.NEGATIVE_INFINITY, saleTime),
      });
    }
    const topProducts = [...grouped.entries()]
      .map(([product_id, group]) => ({
        product_id,
        product_name: names.get(product_id) ?? group.latest_name,
        quantity_base_units: group.quantity,
      }))
      .sort(
        (a, b) =>
          b.quantity_base_units - a.quantity_base_units || a.product_name.localeCompare(b.product_name) || a.product_id.localeCompare(b.product_id)
      )
      .slice(0, 5);
    const configuredThreshold = settings?.low_stock_threshold;
    const threshold = configuredThreshold !== undefined && Number.isFinite(configuredThreshold) && configuredThreshold >= 0 ? configuredThreshold : 0;
    const inventoryHealth = products.reduce(
      (health, product) => {
        if (product.quantity <= 0) health.out_of_stock += 1;
        else if (product.quantity <= threshold) health.low_stock += 1;
        else health.in_stock += 1;
        return health;
      },
      { in_stock: 0, low_stock: 0, out_of_stock: 0 }
    );
    const weeklySales: DashboardWeeklySalesDay[] = Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(weekStart, index);
      const nextDate = this.addDays(date, 1);
      return {
        date,
        sales_usd: eligibleSales
          .filter(sale => this.isWithin(sale.date, date, nextDate) && date <= today)
          .reduce((sum, sale) => sum + sale.total_amount, 0),
        is_today: date.getTime() === today.getTime(),
        is_future: date > today,
      };
    });

    return {
      total_products: products.length,
      active_products: products.filter(product => product.quantity > 0).length,
      today_sales_usd: todaySales.reduce((sum, sale) => sum + sale.total_amount, 0),
      today_sales_syp: todaySales.reduce((sum, sale) => sum + sale.currency_snapshot.secondary_total_amount, 0),
      month_sales_usd: monthSales.reduce((sum, sale) => sum + sale.total_amount, 0),
      month_sales_syp: monthSales.reduce((sum, sale) => sum + sale.currency_snapshot.secondary_total_amount, 0),
      month_profit_usd: monthSales.reduce((sum, sale) => sum + sale.total_profit, 0),
      month_profit_syp: monthSales.reduce((sum, sale) => sum + sale.currency_snapshot.secondary_total_profit, 0),
      weekly_sales: weeklySales,
      inventory_health: inventoryHealth,
      low_stock_products: products
        .filter(product => product.quantity <= threshold)
        .sort((a, b) => Number(b.quantity <= 0) - Number(a.quantity <= 0) || a.quantity - b.quantity || a.name.localeCompare(b.name))
        .map(({ id, name, quantity }) => ({ id, name, quantity })),
      recent_activity: activity,
      top_products: topProducts,
    };
  }

  watch(): Observable<DashboardSnapshot> {
    return liveQuery(() => this.getSnapshot()) as unknown as Observable<DashboardSnapshot>;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private isWithin(date: Date, start: Date, end: Date): boolean {
    return date >= start && date < end;
  }
}
