import { inject, Injectable } from '@angular/core';
import { Category } from '../../../domain/models/category.model';
import { DexieCategoryRepository } from '../../../data-access/repositories/dexie-category.repository';

@Injectable({ providedIn: 'root' })
export class GetCategoryDetailUseCase {
  private readonly repository = inject(DexieCategoryRepository);

  execute(id: string): Promise<Category | undefined> {
    return this.repository.getById(id);
  }
}
