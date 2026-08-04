import { ActivityLog } from "../models/activity-log.model";

export interface ActivityLogRepository {
  add(entry: ActivityLog): Promise<void>;
  list(filter?: ActivityLogListFilter): Promise<readonly ActivityLog[]>;
}

export interface ActivityLogListFilter {
  readonly from?: Date;
  readonly to?: Date;
  readonly eventCode?: string;
  readonly eventCodes?: readonly string[];
}
