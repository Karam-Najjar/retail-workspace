import { Component, inject, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { Router } from "@angular/router";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
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
import { PaginatorComponent } from "../../../shared-ui/paginator/paginator.component";

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
    PaginatorComponent,
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
  private readonly translate = inject(TranslateService);

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
        this.formatTableMoney(sale.total_amount, sale.currency_snapshot.secondary_total_amount),
        this.formatTableMoney(sale.total_cost, sale.currency_snapshot.secondary_total_cost),
        this.formatTableMoney(sale.total_profit, sale.currency_snapshot.secondary_total_profit),
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
    this.facade.page.set(1);
    this.load();
  }

  protected export(): void {
    void this.facade.export(this.filter(), this.fileName(), this.isArabic());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(["/sales", id]);
  }

  protected summaryMoney(amount: number, sypAmount: number): string {
    const primary = this.formatPrimary(amount);
    const secondary = this.formatSecondary(sypAmount);
    return `${primary} $  |  ${secondary}`;
  }

  protected formatTableMoney(primaryAmount: number, sypAmount: number): string {
    const primary = this.formatPrimary(primaryAmount);
    const secondary = this.formatSecondary(sypAmount);
    return `${primary} $\n${secondary}`;
  }

  protected formatPrimary(amount: number): string {
    const scale = 10 ** this.storeProfile.currency.primary.precision;
    const major = amount / scale;
    const trimmed = Number(major.toFixed(this.storeProfile.currency.primary.precision).replace(/\.?0+$/, ""));
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: this.decimals(trimmed),
      maximumFractionDigits: this.storeProfile.currency.primary.precision,
    }).format(trimmed);
  }

  protected formatSecondary(amount: number): string {
    const major = amount / 10 ** this.storeProfile.currency.secondary.precision;
    return `${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(major)} SYP`;
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

  private decimals(value: number): number {
    const text = String(value);
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
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

  protected goToPage(page: number): void {
    void this.facade.goToPage(page, this.filter());
  }
}