import { Component, inject, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "@ngx-translate/core";
import { ActivityLogListFilter, DateRange } from "@retail/kernel";
import { DataTableColumn, DataTableComponent, DataTableRow } from "../../shared-ui/data-table/data-table.component";
import { DateRangeFilterComponent } from "../../shared-ui/date-range-filter/date-range-filter.component";
import { EmptyStateComponent } from "../../shared-ui/empty-state/empty-state.component";
import { ExportButtonComponent } from "../../shared-ui/export-button/export-button.component";
import { ActivityLogFacade } from "./activity-log.facade";
import { ActivityDetailsRendererService } from "./activity-details-renderer.service";

@Component({
  selector: "app-activity-log",
  imports: [
    DataTableComponent,
    DateRangeFilterComponent,
    EmptyStateComponent,
    ExportButtonComponent,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslatePipe,
  ],
  providers: [ActivityDetailsRendererService, ActivityLogFacade],
  templateUrl: "./activity-log.component.html",
  styleUrl: "./activity-log.component.scss",
})
export class ActivityLogComponent implements OnInit {
  protected readonly facade = inject(ActivityLogFacade);
  private readonly detailsRenderer = inject(ActivityDetailsRendererService);
  private readonly router = inject(Router);
  protected range: DateRange = this.todayRange();
  protected activityType = "";
  protected readonly activityTypes = [
    "sales",
    "supplies",
    "productChanges",
    "categoryChanges",
    "supplierChanges",
    "settingsChanges",
    "backupChanges",
  ] as const;
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: "activityLog.dateTime", sortable: true, sortKey: "dateTime" },
    { labelKey: "activityLog.type", sortable: true, sortKey: "type" },
    { labelKey: "activityLog.details", sortable: true, sortKey: "details" },
    { labelKey: "activityLog.operator", sortable: true, sortKey: "operator" },
  ];
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  protected readonly rows = (): readonly DataTableRow[] =>
    this.facade
      .entries()
      .map(entry => ({
        id: entry.id,
        sortValues: {
          dateTime: entry.created_at.getTime(),
          type: entry.event_code,
          details: this.detailsRenderer.render(entry),
          operator: entry.operator_name,
        },
        values: [this.dateFormatter.format(entry.created_at), entry.event_code, this.detailsRenderer.render(entry), entry.operator_name],
      }));
  ngOnInit(): void {
    this.load();
  }
  protected rangeChanged(range: DateRange): void {
    this.range = range;
    this.load();
  }
  protected load(): void {
    void this.facade.load(this.filter());
  }
  protected export(): void {
    void this.facade.export(
      this.filter(),
      `activity-log-report-${this.datePart(this.range.from)}-to-${this.datePart(this.range.to)}.xlsx`,
      this.isArabic()
    );
  }
  protected openEntry(id: string): void {
    const entry = this.facade.entries().find(item => item.id === id);
    if (entry?.related_sale_id) void this.router.navigate(["/sales", entry.related_sale_id]);
    else if (entry?.related_supply_id) void this.router.navigate(["/supplies", entry.related_supply_id]);
  }
  private filter(): ActivityLogListFilter {
    const groups: Record<string, readonly string[]> = {
      sales: ["sale_completed"],
      supplies: ["supply.received"],
      productChanges: [
        "product_created",
        "product.created",
        "product.deleted",
        "inventory.opening_balance.created",
        "inventory.stock.added",
        "inventory.stock.removed",
        "inventory.product.written_off",
      ],
      categoryChanges: ["category.deleted"],
      supplierChanges: ["supplier.deleted"],
      settingsChanges: ["settings.updated"],
      backupChanges: ["backup_imported"],
    };
    return { from: this.range.from, to: this.range.to, eventCodes: this.activityType ? groups[this.activityType] : undefined };
  }
  private todayRange(): DateRange {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1),
      preset: "today",
    };
  }
  private datePart(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  private isArabic(): boolean {
    return document.documentElement.lang.toLowerCase().startsWith("ar");
  }
}
