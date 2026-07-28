import { inject, Injectable } from "@angular/core";
import { Category } from "../../../domain/models/category.model";
import { DexieCategoryRepository } from "../../../data-access/repositories/dexie-category.repository";

@Injectable({ providedIn: "root" })
export class ListCategoriesUseCase {
  private readonly repository = inject(DexieCategoryRepository);

  execute(): Promise<readonly Category[]> {
    return this.repository.list();
  }
}
