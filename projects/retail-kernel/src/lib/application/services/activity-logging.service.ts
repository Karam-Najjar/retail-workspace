import { inject, Injectable } from "@angular/core";
import { ActivityEventCode, ActivityEventPayloadMap, ActivityLog } from "../../domain/models/activity-log.model";
import { DexieActivityLogRepository } from "../../data-access/repositories/dexie-activity-log.repository";
import { ActiveOperatorService } from "./active-operator.service";

export type ActivityLogInput = {
  readonly [TCode in ActivityEventCode]: {
    readonly event_code: TCode;
    readonly entity_type?: string | null;
    readonly entity_id?: string | null;
    readonly entity_name_snapshot?: string | null;
    readonly payload: ActivityEventPayloadMap[TCode];
    readonly related_sale_id?: string | null;
    readonly related_supply_id?: string | null;
  };
}[ActivityEventCode];

@Injectable({ providedIn: "root" })
export class ActivityLoggingService {
  private readonly repository = inject(DexieActivityLogRepository);
  private readonly activeOperatorService = inject(ActiveOperatorService);

  async log(input: ActivityLogInput): Promise<void> {
    const operator = this.activeOperatorService.activeOperator();
    if (!operator) {
      throw new Error("An active operator is required to log activity.");
    }

    const entry: ActivityLog = {
      id: crypto.randomUUID(),
      entity_type: null,
      entity_id: null,
      entity_name_snapshot: null,
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
      ...input,
    };
    await this.repository.add(entry);
  }
}
