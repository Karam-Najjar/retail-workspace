import { ActivityLog } from '../models/activity-log.model';

export interface ActivityLogRepository {
  add<TPayload>(entry: ActivityLog<TPayload>): Promise<void>;
  list(filter?: ActivityLogListFilter): Promise<readonly ActivityLog[]>;
}

export interface ActivityLogListFilter {
  readonly from?: Date;
  readonly to?: Date;
  readonly eventCode?: string;
}
