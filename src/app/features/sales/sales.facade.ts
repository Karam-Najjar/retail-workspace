import { computed, inject, Injectable, signal } from "@angular/core";
import {
  DexieSaleRepository,
  ExcelExportService,
  SaleDetail,
  SaleListEntry,
  SaleListFilter,
  SalesReportingService,
  SalesWorkbookMapper,
  sumCurrencyMinorUnits,
  sumSafeIntegers,
} from "@retail/kernel";
import { NotificationService } from "../../core/notifications/notification.service";
import { ReverseSaleUseCase } from "@retail/kernel/application/use-cases/sales/reverse-sale.use-case";

export interface SalesSummary {
  readonly totalRevenue: number;
  readonly totalCost: number;
  readonly totalProfit: number;
  readonly totalItemsSold: number;
}

@Injectable()
export class SalesFacade {
  private readonly repository = inject(DexieSaleRepository);
  private readonly reporting = inject(SalesReportingService);
  private readonly excel = inject(ExcelExportService);
  private readonly notifications = inject(NotificationService);
  private readonly reverseSale = inject(ReverseSaleUseCase);

  readonly sales = signal<readonly SaleListEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly summary = computed<SalesSummary>(() => {
    const sales = this.sales();
    return {
      totalRevenue: sumCurrencyMinorUnits(sales.map(entry => entry.sale.total_amount)),
      totalCost: sumCurrencyMinorUnits(sales.map(entry => entry.sale.total_cost)),
      totalProfit: sumCurrencyMinorUnits(sales.map(entry => entry.sale.total_profit)),
      totalItemsSold: sumSafeIntegers(
        sales.map(entry => entry.totalItemsSold),
        "Sales item total is too large."
      ),
    };
  });

  async load(filter: SaleListFilter = {}): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.sales.set(await this.repository.list(filter));
    } catch {
      this.sales.set([]);
      this.error.set("sales.errors.load");
      this.notifications.error("sales.errors.load");
    } finally {
      this.loading.set(false);
    }
  }

  get(id: string): Promise<SaleDetail | undefined> {
    return this.repository.getDetail(id);
  }

  async export(filter: SaleListFilter, fileName: string, rtl: boolean): Promise<void> {
    this.exporting.set(true);
    try {
      const report = await this.reporting.getReport(filter);
      await this.excel.export({ fileName, rtl, sheets: [SalesWorkbookMapper.map(report.details)] });
      this.notifications.success("notifications.success.exportCompleted");
    } catch {
      this.notifications.error("notifications.errors.export");
    } finally {
      this.exporting.set(false);
    }
  }

  async reverse(id: string): Promise<boolean> {
    try {
      await this.reverseSale.execute(id);
      this.notifications.success("notifications.success.saleReversed");
      return true;
    } catch {
      this.notifications.error("sales.errors.reverse");
      return false;
    }
  }
}
