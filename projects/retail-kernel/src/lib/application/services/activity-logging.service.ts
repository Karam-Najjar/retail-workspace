import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { DexieActivityLogRepository } from '../../data-access/repositories/dexie-activity-log.repository';
import { ActiveOperatorService } from './active-operator.service';

export interface ActivityLogInput<TPayload> {
  readonly event_code: string;
  readonly entity_type?: string | null;
  readonly entity_id?: string | null;
  readonly entity_name_snapshot?: string | null;
  readonly payload: TPayload;
  readonly related_sale_id?: string | null;
  readonly related_supply_id?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityLoggingService {
  private readonly repository = inject(DexieActivityLogRepository);
  private readonly activeOperatorService = inject(ActiveOperatorService);

  async log<TPayload>(input: ActivityLogInput<TPayload>): Promise<void> {
    const operator = this.activeOperatorService.activeOperator();
    if (!operator) {
      throw new Error('An active operator is required to log activity.');
    }

    const entry: ActivityLog<TPayload> = {
      id: crypto.randomUUID(),
      event_code: input.event_code,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      entity_name_snapshot: input.entity_name_snapshot ?? null,
      payload: input.payload,
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: input.related_sale_id ?? null,
      related_supply_id: input.related_supply_id ?? null,
      created_at: new Date(),
    };
    await this.repository.add(entry);
  }
}
