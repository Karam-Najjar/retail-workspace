import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { ActivityLogListFilter } from '../../domain/repository-contracts/activity-log.repository';
import { DexieActivityLogRepository } from '../../data-access/repositories/dexie-activity-log.repository';

@Injectable({ providedIn: 'root' })
export class ActivityReportingService {
  private readonly repository = inject(DexieActivityLogRepository);

  list(filter: ActivityLogListFilter = {}): Promise<readonly ActivityLog[]> {
    return this.repository.list(filter);
  }
}
