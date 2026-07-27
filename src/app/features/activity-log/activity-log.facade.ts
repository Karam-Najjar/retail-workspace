import { inject, Injectable, signal } from '@angular/core';
import { ActivityLog, ActivityLogListFilter, ActivityReportingService, ExcelExportService, ActivityWorkbookMapper } from '@retail/kernel';

@Injectable()
export class ActivityLogFacade {
  private readonly reporting = inject(ActivityReportingService);
  private readonly excel = inject(ExcelExportService);
  readonly entries = signal<readonly ActivityLog[]>([]);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);

  async load(filter: ActivityLogListFilter): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.entries.set(await this.reporting.list(filter)); }
    catch { this.entries.set([]); this.error.set('activityLog.errors.load'); }
    finally { this.loading.set(false); }
  }

  async export(filter: ActivityLogListFilter, fileName: string, rtl: boolean): Promise<void> {
    this.exporting.set(true);
    try { await this.excel.export({ fileName, rtl, sheets: [ActivityWorkbookMapper.map(await this.reporting.list(filter))] }); }
    finally { this.exporting.set(false); }
  }
}
