import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { ActivityLogRepository } from "../../domain/repository-contracts/activity-log.repository";
import { ActivityLogListFilter } from "../../domain/repository-contracts/activity-log.repository";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieActivityLogRepository implements ActivityLogRepository {
  private readonly database = inject(RetailDatabase);

  async add<TPayload>(entry: ActivityLog<TPayload>): Promise<void> {
    await this.database.activity_logs.add(entry);
  }

  async list(filter: ActivityLogListFilter = {}): Promise<readonly ActivityLog[]> {
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
