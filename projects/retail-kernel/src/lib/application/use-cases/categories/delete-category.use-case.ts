import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { Category } from "../../../domain/models/category.model";
import { DexieCategoryRepository } from "../../../data-access/repositories/dexie-category.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";

@Injectable({ providedIn: "root" })
export class DeleteCategoryUseCase {
  private readonly repository = inject(DexieCategoryRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(category: Category): Promise<number> {
    if (category.system_code) {
      throw new Error("System categories cannot be deleted.");
    }
    const operator = this.activeOperator.activeOperator();
    if (!operator) {
      throw new Error("An active operator is required.");
    }
    const affectedProducts = await this.repository.countAffectedProducts(category.id);
    const activityLog: ActivityLog<{ affected_products: number }> = {
      id: crypto.randomUUID(),
      event_code: "category.deleted",
      entity_type: "category",
      entity_id: category.id,
      entity_name_snapshot: category.name,
      payload: { affected_products: affectedProducts },
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: new Date(),
    };
    await this.repository.deleteWithActivity(category, activityLog);
    return affectedProducts;
  }
}
