import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { ActivityLogRepository, ActivityLogListFilter } from "../../domain/repository-contracts/activity-log.repository";
import { RetailDatabase } from "../database/retail.database";
import { createPagedResult, PagedResult } from "../../application/dto/pagination.model";

@Injectable({ providedIn: "root" })
export class DexieActivityLogRepository implements ActivityLogRepository {
  private readonly database = inject(RetailDatabase);

  async add(entry: ActivityLog): Promise<void> {
    await this.database.activity_logs.add(entry);
  }

  async list(filter: ActivityLogListFilter = {}): Promise<PagedResult<ActivityLog>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    // First get filtered logs without pagination
    const allLogs = await this.queryFilteredLogs(filter);

    const total = allLogs.length;
    const start = (page - 1) * pageSize;
    const items = allLogs.slice(start, start + pageSize);

    return createPagedResult(items, total, page, pageSize);
  }

  private async queryFilteredLogs(filter: ActivityLogListFilter): Promise<readonly ActivityLog[]> {
    const logs =
      filter.from && filter.to
        ? await this.database.activity_logs.where("created_at").between(filter.from, filter.to, true, true).reverse().sortBy("created_at")
        : await this.database.activity_logs.orderBy("created_at").reverse().toArray();

    return logs.filter(
      entry =>
        (!filter.eventCode || entry.event_code === filter.eventCode) && (!filter.eventCodes?.length || filter.eventCodes.includes(entry.event_code))
    );
  }
}
