import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { DexieCategoryRepository } from "../../../data-access/repositories/dexie-category.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";

@Injectable({ providedIn: "root" })
export class DeleteCategoryUseCase {
  private readonly repository = inject(DexieCategoryRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(categoryId: string): Promise<number> {
    const category = await this.repository.getById(categoryId);
    if (!category) {
      throw new Error("Category could not be found.");
    }
    if (category.system_code) {
      throw new Error("System categories cannot be deleted.");
    }
    const operator = this.activeOperator.activeOperator();
    if (!operator) {
      throw new Error("An active operator is required.");
    }
    const activityLog: ActivityLog<"category.deleted"> = {
      id: crypto.randomUUID(),
      event_code: "category.deleted",
      entity_type: "category",
      entity_id: category.id,
      entity_name_snapshot: category.name,
      payload: { affected_products: 0 },
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
    };
    return this.repository.deleteWithActivity(category.id, activityLog);
  }
}
