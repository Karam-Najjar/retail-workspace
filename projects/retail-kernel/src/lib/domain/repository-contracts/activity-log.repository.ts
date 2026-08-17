import { PagedResult } from "@retail/kernel";
import { ActivityLog } from "../models/activity-log.model";

export interface ActivityLogRepository {
  add(entry: ActivityLog): Promise<void>;
  list(filter?: ActivityLogListFilter): Promise<PagedResult<ActivityLog>>;
}

export interface ActivityLogListFilter {
  readonly from?: Date;
  readonly to?: Date;
  readonly eventCode?: string;
  readonly eventCodes?: readonly string[];
  readonly page?: number;
  readonly pageSize?: number;
}
