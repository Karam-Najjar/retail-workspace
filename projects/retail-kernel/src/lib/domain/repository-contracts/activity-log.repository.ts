import { ActivityLog } from '../models/activity-log.model';

export interface ActivityLogRepository {
  add<TPayload>(entry: ActivityLog<TPayload>): Promise<void>;
}
