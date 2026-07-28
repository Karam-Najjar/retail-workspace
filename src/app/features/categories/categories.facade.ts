import { computed, inject, Injectable, signal } from "@angular/core";
import {
  Category,
  DeleteCategoryUseCase,
  GetCategoryDetailUseCase,
  ListCategoriesUseCase,
  SaveCategoryInput,
  SaveCategoryUseCase,
} from "@retail/kernel";
import { DexieCategoryRepository } from "@retail/kernel";

@Injectable()
export class CategoriesFacade {
  private readonly listCategories = inject(ListCategoriesUseCase);
  private readonly getCategoryDetail = inject(GetCategoryDetailUseCase);
  private readonly saveCategory = inject(SaveCategoryUseCase);
  private readonly deleteCategory = inject(DeleteCategoryUseCase);
  private readonly repository = inject(DexieCategoryRepository);

  readonly categories = signal<readonly Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasCategories = computed(() => this.categories().length > 0);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.categories.set(await this.listCategories.execute());
    } catch {
      this.error.set("categories.errors.load");
    } finally {
      this.loading.set(false);
    }
  }

  get(id: string): Promise<Category | undefined> {
    return this.getCategoryDetail.execute(id);
  }

  async save(input: SaveCategoryInput): Promise<Category | null> {
    try {
      const category = await this.saveCategory.execute(input);
      await this.load();
      return category;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "categories.errors.save");
      return null;
    }
  }

  async delete(category: Category): Promise<number | null> {
    try {
      const affectedProducts = await this.deleteCategory.execute(category);
      await this.load();
      return affectedProducts;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "categories.errors.delete");
      return null;
    }
  }

  countAffectedProducts(categoryId: string): Promise<number> {
    return this.repository.countAffectedProducts(categoryId);
  }
}
