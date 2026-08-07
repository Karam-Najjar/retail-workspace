import { Component, inject, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import {
  DateRange,
  formatDualCurrencyMinorUnits,
  SaleCurrencySnapshot,
  SaleListFilter,
  STORE_PROFILE,
  StoreProfile,
  StoreProfileService,
} from "@retail/kernel";
import { DataTableColumn, DataTableComponent, DataTableRow } from "../../../shared-ui/data-table/data-table.component";
import { DateRangeFilterComponent } from "../../../shared-ui/date-range-filter/date-range-filter.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { ExportButtonComponent } from "../../../shared-ui/export-button/export-button.component";
import { SummaryCardComponent } from "../../../shared-ui/summary-card/summary-card.component";
import { SalesFacade } from "../sales.facade";

type DatePreset = "today" | "week" | "month" | "custom";

@Component({
  selector: "app-sale-list",
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
  templateUrl: "./sale-list.component.html",
  styleUrl: "./sale-list.component.scss",
})
export class SaleListComponent implements OnInit {
  protected readonly facade = inject(SalesFacade);
  private readonly router = inject(Router);
  private readonly profile = inject(StoreProfileService);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  private readonly storeProfile: StoreProfile = inject(STORE_PROFILE);

  protected range: DateRange = this.todayRange();
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: "sales.dateTime", sortable: true, sortKey: "dateTime" },
    { labelKey: "sales.saleTotal", sortable: true, sortKey: "saleTotal" },
    { labelKey: "sales.costTotal", sortable: true, sortKey: "costTotal" },
    { labelKey: "sales.profit", sortable: true, sortKey: "profit" },
    { labelKey: "sales.operator", sortable: true, sortKey: "operator" },
  ];

  protected readonly rows = (): readonly DataTableRow[] =>
    this.facade.sales().map(({ sale }) => ({
      id: sale.id,
      sortValues: {
        dateTime: sale.date.getTime(),
        saleTotal: sale.total_amount,
        costTotal: sale.total_cost,
        profit: sale.total_profit,
        operator: sale.operator_name,
      },
      values: [
        this.dateFormatter.format(sale.date),
        this.formatDual(sale.total_amount, sale.currency_snapshot),
        this.formatDual(sale.total_cost, sale.currency_snapshot),
        this.formatDual(sale.total_profit, sale.currency_snapshot),
        sale.operator_name,
      ],
    }));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    void this.facade.load(this.filter());
  }
  protected rangeChanged(range: DateRange): void {
    this.range = range;
    this.load();
  }
  protected export(): void {
    void this.facade.export(this.filter(), this.fileName(), this.isArabic());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(["/sales", id]);
  }

  protected summaryMoney(amount: number): string {
    const firstSale = this.facade.sales().at(0)?.sale;
    if (firstSale) return this.formatDual(amount, firstSale.currency_snapshot);
    return formatDualCurrencyMinorUnits(
      amount,
      this.storeProfile.currency.primary.precision,
      this.storeProfile.currency.primary.code,
      "1",
      this.storeProfile.currency.secondary.code,
      this.storeProfile.currency.secondary.precision
    );
  }

  private formatDual(amount: number, snapshot: SaleCurrencySnapshot): string {
    return formatDualCurrencyMinorUnits(
      amount,
      snapshot.primary_precision,
      snapshot.primary_code,
      snapshot.exchange_rate,
      this.storeProfile.currency.secondary.code,
      this.storeProfile.currency.secondary.precision
    );
  }

  private filter(): SaleListFilter {
    return { from: this.range.from, to: this.range.to };
  }
  private todayRange(): DateRange {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1),
      preset: "today",
    };
  }
  private fileName(): string {
    return `sales-report-${this.datePart(this.range.from)}-to-${this.datePart(this.range.to)}.xlsx`;
  }
  private datePart(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  private isArabic(): boolean {
    return document.documentElement.lang.toLowerCase().startsWith("ar");
  }
}
