import { Category } from '../models/category.model';

export interface CategoryRepository {
  list(): Promise<readonly Category[]>;
  getById(id: string): Promise<Category | undefined>;
  save(category: Category): Promise<void>;
  deleteWithActivity(category: Category, activityLog: unknown): Promise<void>;
  hasName(name: string, excludedId?: string): Promise<boolean>;
  countAffectedProducts(_categoryId: string): Promise<number>;
}
