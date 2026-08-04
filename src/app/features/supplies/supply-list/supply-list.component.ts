import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { DateRange, SupplyListFilter } from "@retail/kernel";
import { DataTableColumn, DataTableComponent, DataTableRow } from "../../../shared-ui/data-table/data-table.component";
import { DateRangeFilterComponent } from "../../../shared-ui/date-range-filter/date-range-filter.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { ExportButtonComponent } from "../../../shared-ui/export-button/export-button.component";
import { SummaryCardComponent } from "../../../shared-ui/summary-card/summary-card.component";
import { AddStockFormComponent } from "../add-stock-form/add-stock-form.component";
import { SuppliesFacade } from "../supplies.facade";

@Component({
  selector: "app-supply-list",
  imports: [
    DataTableComponent,
    DateRangeFilterComponent,
    EmptyStateComponent,
    ExportButtonComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    SummaryCardComponent,
    TranslatePipe,
  ],
  providers: [SuppliesFacade],
  templateUrl: "./supply-list.component.html",
  styleUrl: "./supply-list.component.scss",
})
export class SupplyListComponent implements OnInit {
  protected readonly facade = inject(SuppliesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  protected range: DateRange = this.todayRange();
  protected supplierId = "";
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: "supplies.dateTime", sortable: true, sortKey: "dateTime" },
    { labelKey: "supplies.supplier", sortable: true, sortKey: "supplier" },
    { labelKey: "supplies.itemsCount", sortable: true, sortKey: "itemsCount" },
    { labelKey: "supplies.totalCost", sortable: true, sortKey: "totalCost" },
    { labelKey: "supplies.operator", sortable: true, sortKey: "operator" },
  ];
  protected readonly rows = (): readonly DataTableRow[] =>
    this.facade
      .supplies()
      .map(({ supply, itemCount }) => ({
        id: supply.id,
        sortValues: {
          dateTime: supply.date.getTime(),
          supplier: supply.supplier_name,
          itemsCount: itemCount,
          totalCost: supply.total_cost,
          operator: supply.operator_name,
        },
        values: [
          this.dateFormatter.format(supply.date),
          supply.supplier_name,
          String(itemCount),
          `${(supply.total_cost / 100).toFixed(2)} ${supply.currency_snapshot.primary_code}`,
          supply.operator_name,
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
  protected openCreate(): void {
    this.dialog
      .open(AddStockFormComponent, { width: "min(72rem, calc(100vw - 2rem))", maxHeight: "calc(100vh - 2rem)" })
      .afterClosed()
      .subscribe(result => {
        if (result) this.load();
      });
  }
  protected openDetail(id: string): void {
    void this.router.navigate(["/supplies", id]);
  }
  private filter(): SupplyListFilter {
    return { supplierId: this.supplierId || undefined, from: this.range.from, to: this.range.to };
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
    return `supplies-report-${this.datePart(this.range.from)}-to-${this.datePart(this.range.to)}.xlsx`;
  }
  private datePart(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  private isArabic(): boolean {
    return document.documentElement.lang.toLowerCase().startsWith("ar");
  }
}
