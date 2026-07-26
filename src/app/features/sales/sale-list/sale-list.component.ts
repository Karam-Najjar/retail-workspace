import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DateRange, SaleCurrencySnapshot, SaleListFilter, StoreProfileService } from '@retail/kernel';
import { DataTableColumn, DataTableComponent, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { DateRangeFilterComponent } from '../../../shared-ui/date-range-filter/date-range-filter.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { ExportButtonComponent } from '../../../shared-ui/export-button/export-button.component';
import { SummaryCardComponent } from '../../../shared-ui/summary-card/summary-card.component';
import { SalesFacade } from '../sales.facade';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-sale-list',
  imports: [
    DataTableComponent,
    EmptyStateComponent,
    MatCardModule,
    DateRangeFilterComponent,
    ExportButtonComponent,
    SummaryCardComponent,
    TranslatePipe,
  ],
  providers: [SalesFacade],
  templateUrl: './sale-list.component.html',
  styleUrl: './sale-list.component.scss',
})
export class SaleListComponent implements OnInit {
  protected readonly facade = inject(SalesFacade);
  private readonly router = inject(Router);
  private readonly profile = inject(StoreProfileService);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected range: DateRange = this.todayRange();
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: 'sales.dateTime' },
    { labelKey: 'sales.saleTotal' },
    { labelKey: 'sales.costTotal' },
    { labelKey: 'sales.profit' },
    { labelKey: 'sales.operator' },
  ];

  protected readonly rows = (): readonly DataTableRow[] => this.facade.sales().map(({ sale }) => ({
    id: sale.id,
    values: [
      this.dateFormatter.format(sale.date),
      this.formatPrimary(sale.total_amount, sale.currency_snapshot),
      this.formatPrimary(sale.total_cost, sale.currency_snapshot),
      this.formatPrimary(sale.total_profit, sale.currency_snapshot),
      sale.operator_name,
    ],
  }));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void { void this.facade.load(this.filter()); }
  protected rangeChanged(range: DateRange): void { this.range = range; this.load(); }
  protected export(): void { void this.facade.export(this.filter(), this.fileName(), this.isArabic()); }

  protected openDetail(id: string): void {
    void this.router.navigate(['/sales', id]);
  }

  protected summaryMoney(amount: number): string {
    const firstSale = this.facade.sales().at(0)?.sale;
    if (firstSale) return this.formatPrimary(amount, firstSale.currency_snapshot);

    const currency = this.profile.profile.currency.primary;
    return `${(amount / 10 ** currency.precision).toFixed(currency.precision)} ${currency.code}`;
  }

  private formatPrimary(amount: number, snapshot: SaleCurrencySnapshot): string {
    return `${(amount / 10 ** snapshot.primary_precision).toFixed(snapshot.primary_precision)} ${snapshot.primary_code}`;
  }

  private filter(): SaleListFilter { return { from: this.range.from, to: this.range.to }; }
  private todayRange(): DateRange { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1), preset: 'today' }; }
  private fileName(): string { return `sales-report-${this.datePart(this.range.from)}-to-${this.datePart(this.range.to)}.xlsx`; }
  private datePart(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private isArabic(): boolean { return document.documentElement.lang.toLowerCase().startsWith('ar'); }
}
