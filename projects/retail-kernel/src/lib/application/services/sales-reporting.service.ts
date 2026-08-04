import { inject, Injectable } from "@angular/core";
import { SalesSummary } from "../dto/sales-summary.model";
import { sumCurrencyMinorUnits, sumSafeIntegers } from "../../domain/policies/currency-rounding.policy";
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
      summary: {
        total_revenue: sumCurrencyMinorUnits(details.map(detail => detail.sale.total_amount)),
        total_cost: sumCurrencyMinorUnits(details.map(detail => detail.sale.total_cost)),
        total_profit: sumCurrencyMinorUnits(details.map(detail => detail.sale.total_profit)),
        total_items_sold: sumSafeIntegers(
          details.flatMap(detail => detail.items.map(item => item.quantity_base_units)),
          "Sales item quantity total is too large."
        ),
      } satisfies SalesSummary,
    };
  }
}
