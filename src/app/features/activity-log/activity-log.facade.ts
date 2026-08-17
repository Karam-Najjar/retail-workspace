import { inject, Injectable, signal } from "@angular/core";
import {
  ActivityLog,
  ActivityLogListFilter,
  ActivityReportingService,
  ExcelExportService,
  ActivityWorkbookMapper,
  PagedResult,
} from "@retail/kernel";
import { NotificationService } from "../../core/notifications/notification.service";

@Injectable()
export class ActivityLogFacade {
  private readonly reporting = inject(ActivityReportingService);
  private readonly excel = inject(ExcelExportService);
  private readonly notifications = inject(NotificationService);
  readonly entries = signal<readonly ActivityLog[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);

  async load(filter: ActivityLogListFilter): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.reporting.list({
        ...filter,
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.applyResult(result);
    } catch {
      this.entries.set([]);
      this.error.set("activityLog.errors.load");
      this.notifications.error("activityLog.errors.load");
    } finally {
      this.loading.set(false);
    }
  }

  async goToPage(page: number, filter: ActivityLogListFilter): Promise<void> {
    this.page.set(page);
    await this.load(filter);
  }

  async export(filter: ActivityLogListFilter, fileName: string, rtl: boolean): Promise<void> {
    this.exporting.set(true);
    try {
      const result = await this.reporting.list({ ...filter, page: 1, pageSize: 100000 });
      await this.excel.export({ fileName, rtl, sheets: [ActivityWorkbookMapper.map(result.items)] });
      this.notifications.success("notifications.success.exportCompleted");
    } catch {
      this.notifications.error("notifications.errors.export");
    } finally {
      this.exporting.set(false);
    }
  }

  private applyResult(result: PagedResult<ActivityLog>): void {
    this.entries.set(result.items);
    this.total.set(result.total);
    this.totalPages.set(result.totalPages);
  }
}
