import { inject, Injectable } from '@angular/core';
import { Category } from '../../../domain/models/category.model';
import { DexieCategoryRepository } from '../../../data-access/repositories/dexie-category.repository';

export interface SaveCategoryInput {
  readonly id?: string;
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class SaveCategoryUseCase {
  private readonly repository = inject(DexieCategoryRepository);

  async execute(input: SaveCategoryInput): Promise<Category> {
    const name = input.name.trim();
    if (!name || name.length > 100) {
      throw new Error('Category name must be between 1 and 100 characters.');
    }

    const existing = input.id ? await this.repository.getById(input.id) : undefined;
    if (existing?.system_code) {
      throw new Error('System categories cannot be edited.');
    }
    if (await this.repository.hasName(name, input.id)) {
      throw new Error('A category with this name already exists.');
    }

    const now = new Date();
    const category: Category = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      system_code: existing?.system_code ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await this.repository.save(category);
    return category;
  }
}
