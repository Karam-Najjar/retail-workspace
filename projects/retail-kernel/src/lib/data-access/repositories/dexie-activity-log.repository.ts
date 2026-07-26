import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { ActivityLogRepository } from '../../domain/repository-contracts/activity-log.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieActivityLogRepository implements ActivityLogRepository {
  private readonly database = inject(RetailDatabase);

  async add<TPayload>(entry: ActivityLog<TPayload>): Promise<void> {
    await this.database.activity_logs.add(entry);
  }
}
