import { Category } from "../models/category.model";
import { ActivityLog } from "../models/activity-log.model";

export interface CategoryRepository {
  list(): Promise<readonly Category[]>;
  getById(id: string): Promise<Category | undefined>;
  save(category: Category): Promise<void>;
  deleteWithActivity(categoryId: string, activityLog: ActivityLog<"category.deleted">): Promise<number>;
  hasName(name: string, excludedId?: string): Promise<boolean>;
  countAffectedProducts(_categoryId: string): Promise<number>;
}
