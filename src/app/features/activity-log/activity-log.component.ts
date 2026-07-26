import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivityLogListFilter, DateRange } from '@retail/kernel';
import { DataTableColumn, DataTableComponent, DataTableRow } from '../../shared-ui/data-table/data-table.component';
import { DateRangeFilterComponent } from '../../shared-ui/date-range-filter/date-range-filter.component';
import { EmptyStateComponent } from '../../shared-ui/empty-state/empty-state.component';
import { ExportButtonComponent } from '../../shared-ui/export-button/export-button.component';
import { ActivityLogFacade } from './activity-log.facade';
import { ActivityDetailsRendererService } from './activity-details-renderer.service';

@Component({ selector: 'app-activity-log', imports: [DataTableComponent, DateRangeFilterComponent, EmptyStateComponent, ExportButtonComponent, FormsModule, MatFormFieldModule, MatSelectModule, TranslatePipe], providers: [ActivityDetailsRendererService, ActivityLogFacade], templateUrl: './activity-log.component.html', styleUrl: './activity-log.component.scss' })
export class ActivityLogComponent implements OnInit {
  protected readonly facade = inject(ActivityLogFacade);
  private readonly detailsRenderer = inject(ActivityDetailsRendererService);
  protected range: DateRange = this.todayRange();
  protected eventCode = '';
  protected readonly columns: readonly DataTableColumn[] = [{ labelKey: 'activityLog.dateTime' }, { labelKey: 'activityLog.type' }, { labelKey: 'activityLog.details' }, { labelKey: 'activityLog.operator' }];
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  protected readonly rows = (): readonly DataTableRow[] => this.facade.entries().map((entry) => ({ id: entry.id, values: [this.dateFormatter.format(entry.created_at), entry.event_code, this.detailsRenderer.render(entry), entry.operator_name] }));
  protected readonly eventCodes = (): readonly string[] => [...new Set(this.facade.entries().map((entry) => entry.event_code))].sort();
  ngOnInit(): void { this.load(); }
  protected rangeChanged(range: DateRange): void { this.range = range; this.load(); }
  protected load(): void { void this.facade.load(this.filter()); }
  protected export(): void { void this.facade.export(this.filter(), `activity-log-report-${this.datePart(this.range.from)}-to-${this.datePart(this.range.to)}.xlsx`, this.isArabic()); }
  private filter(): ActivityLogListFilter { return { from: this.range.from, to: this.range.to, eventCode: this.eventCode || undefined }; }
  private todayRange(): DateRange { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1), preset: 'today' }; }
  private datePart(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private isArabic(): boolean { return document.documentElement.lang.toLowerCase().startsWith('ar'); }
}
