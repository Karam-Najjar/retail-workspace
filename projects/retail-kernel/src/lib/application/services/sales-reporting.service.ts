import { inject, Injectable } from "@angular/core";
import { SalesSummary } from "../dto/sales-summary.model";
import { SaleDetail, SaleListFilter } from "../../domain/repository-contracts/sale.repository";
import { DexieSaleRepository } from "../../data-access/repositories/dexie-sale.repository";

export interface SalesReport {
  readonly details: readonly SaleDetail[];
  readonly summary: SalesSummary;
}

@Injectable({ providedIn: "root" })
export class SalesReportingService {
  private readonly repository = inject(DexieSaleRepository);

  async getReport(filter: SaleListFilter = {}): Promise<SalesReport> {
    const entries = await this.repository.list(filter);
    const details = (await Promise.all(entries.map(entry => this.repository.getDetail(entry.sale.id)))).filter(
      (detail): detail is SaleDetail => detail !== undefined
    );
    return {
      details,
      summary: details.reduce<SalesSummary>(
        (summary, detail) => ({
          total_revenue: summary.total_revenue + detail.sale.total_amount,
          total_cost: summary.total_cost + detail.sale.total_cost,
          total_profit: summary.total_profit + detail.sale.total_profit,
          total_items_sold: summary.total_items_sold + detail.items.reduce((total, item) => total + item.quantity_base_units, 0),
        }),
        { total_revenue: 0, total_cost: 0, total_profit: 0, total_items_sold: 0 }
      ),
    };
  }
}
