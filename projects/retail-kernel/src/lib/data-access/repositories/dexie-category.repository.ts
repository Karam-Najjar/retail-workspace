import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { Category } from "../../domain/models/category.model";
import { CategoryRepository } from "../../domain/repository-contracts/category.repository";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieCategoryRepository implements CategoryRepository {
  private readonly database = inject(RetailDatabase);

  list(): Promise<readonly Category[]> {
    return this.database.categories.orderBy("name").toArray();
  }

  getById(id: string): Promise<Category | undefined> {
    return this.database.categories.get(id);
  }

  async save(category: Category): Promise<void> {
    await this.database.categories.put(category);
  }

  async deleteWithActivity(categoryId: string, activityLog: ActivityLog<"category.deleted">): Promise<number> {
    return this.database.transaction(
      "rw",
      this.database.categories,
      this.database.products,
      this.database.activity_logs,
      async () => {
        const category = await this.database.categories.get(categoryId);
        if (!category) throw new Error("Category could not be found.");
        if (category.system_code) throw new Error("System categories cannot be deleted.");
        const other = await this.database.categories.where("system_code").equals("other").first();
        if (!other) throw new Error("The system Other category could not be found.");

        const affectedProducts = await this.database.products.where("category_id").equals(category.id).toArray();
        await this.database.products.bulkPut(affectedProducts.map(product => ({ ...product, category_id: other.id })));
        await this.database.categories.delete(category.id);
        await this.database.activity_logs.add({
          ...activityLog,
          payload: { affected_products: affectedProducts.length },
        });
        return affectedProducts.length;
      }
    );
  }

  async hasName(name: string, excludedId?: string): Promise<boolean> {
    const normalized = name.trim().toLocaleLowerCase();
    const categories = await this.database.categories.toArray();
    return categories.some(category => category.id !== excludedId && category.name.trim().toLocaleLowerCase() === normalized);
  }

  countAffectedProducts(categoryId: string): Promise<number> {
    return this.database.products.where("category_id").equals(categoryId).count();
  }
}
