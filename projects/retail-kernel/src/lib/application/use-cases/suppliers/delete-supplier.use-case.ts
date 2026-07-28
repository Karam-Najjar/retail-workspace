import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { Supplier } from "../../../domain/models/supplier.model";
import { DexieSupplierRepository } from "../../../data-access/repositories/dexie-supplier.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";

@Injectable({ providedIn: "root" })
export class DeleteSupplierUseCase {
  private readonly repository = inject(DexieSupplierRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(supplier: Supplier): Promise<number> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");
    const affectedSupplies = await this.repository.countAffectedSupplies(supplier.id);
    const activityLog: ActivityLog<{ affected_supplies: number }> = {
      id: crypto.randomUUID(),
      event_code: "supplier.deleted",
      entity_type: "supplier",
      entity_id: supplier.id,
      entity_name_snapshot: supplier.name,
      payload: { affected_supplies: affectedSupplies },
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
    };
    await this.repository.deleteWithActivity(supplier, activityLog);
    return affectedSupplies;
  }
}
