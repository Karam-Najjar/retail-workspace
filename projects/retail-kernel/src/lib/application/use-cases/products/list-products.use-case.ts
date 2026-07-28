import { inject, Injectable } from "@angular/core";
import { Product } from "../../../domain/models/product.model";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";

@Injectable({ providedIn: "root" })
export class ListProductsUseCase {
  private readonly repository = inject(DexieProductRepository);
  execute(search?: string, categoryId?: string): Promise<readonly Product[]> {
    return this.repository.list(search, categoryId);
  }
}
