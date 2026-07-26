import { computed, inject, Injectable, signal } from '@angular/core';
import { DexieSaleRepository, SaleDetail, SaleListEntry, SaleListFilter } from '@retail/kernel';

export interface SalesSummary {
  readonly totalRevenue: number;
  readonly totalCost: number;
  readonly totalProfit: number;
  readonly totalItemsSold: number;
}

@Injectable()
export class SalesFacade {
  private readonly repository = inject(DexieSaleRepository);

  readonly sales = signal<readonly SaleListEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = computed<SalesSummary>(() => this.sales().reduce<SalesSummary>((summary, entry) => ({
    totalRevenue: summary.totalRevenue + entry.sale.total_amount,
    totalCost: summary.totalCost + entry.sale.total_cost,
    totalProfit: summary.totalProfit + entry.sale.total_profit,
    totalItemsSold: summary.totalItemsSold + entry.totalItemsSold,
  }), { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalItemsSold: 0 }));

  async load(filter: SaleListFilter = {}): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.sales.set(await this.repository.list(filter));
    } catch {
      this.sales.set([]);
      this.error.set('sales.errors.load');
    } finally {
      this.loading.set(false);
    }
  }

  get(id: string): Promise<SaleDetail | undefined> {
    return this.repository.getDetail(id);
  }
}
