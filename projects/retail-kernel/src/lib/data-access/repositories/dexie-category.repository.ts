import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { Category } from '../../domain/models/category.model';
import { CategoryRepository } from '../../domain/repository-contracts/category.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieCategoryRepository implements CategoryRepository {
  private readonly database = inject(RetailDatabase);

  list(): Promise<readonly Category[]> {
    return this.database.categories.orderBy('name').toArray();
  }

  getById(id: string): Promise<Category | undefined> {
    return this.database.categories.get(id);
  }

  async save(category: Category): Promise<void> {
    await this.database.categories.put(category);
  }

  async deleteWithActivity(category: Category, activityLog: unknown): Promise<void> {
    await this.database.transaction('rw', this.database.categories, this.database.activity_logs, async () => {
      await this.database.categories.delete(category.id);
      await this.database.activity_logs.add(activityLog as ActivityLog);
    });
  }

  async hasName(name: string, excludedId?: string): Promise<boolean> {
    const normalized = name.trim().toLocaleLowerCase();
    const categories = await this.database.categories.toArray();
    return categories.some((category) => category.id !== excludedId && category.name.trim().toLocaleLowerCase() === normalized);
  }

  countAffectedProducts(_categoryId: string): Promise<number> {
    return Promise.resolve(0);
  }
}
