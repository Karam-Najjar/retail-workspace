import { inject, Injectable } from "@angular/core";
import { Category } from "../../../domain/models/category.model";
import { DexieCategoryRepository } from "../../../data-access/repositories/dexie-category.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";

export interface SaveCategoryInput {
  readonly id?: string;
  readonly name: string;
}

@Injectable({ providedIn: "root" })
export class SaveCategoryUseCase {
  private readonly repository = inject(DexieCategoryRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(input: SaveCategoryInput): Promise<Category> {
    const name = input.name.trim();
    if (!name || name.length > 100) {
      throw new Error("Category name must be between 1 and 100 characters.");
    }

    const existing = input.id ? await this.repository.getById(input.id) : undefined;
    if (existing?.system_code) {
      throw new Error("System categories cannot be edited.");
    }
    if (await this.repository.hasName(name, input.id)) {
      throw new Error("A category with this name already exists.");
    }
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");

    const now = new Date();
    const category: Category = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      system_code: existing?.system_code ?? null,
      created_by_operator_id: existing?.created_by_operator_id ?? operator.id,
      last_modified_by_operator_id: operator.id,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await this.repository.save(category);
    return category;
  }
}
