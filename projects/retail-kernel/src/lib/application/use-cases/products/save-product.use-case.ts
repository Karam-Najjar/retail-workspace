import { inject, Injectable } from '@angular/core';
import { Product } from '../../../domain/models/product.model';
import { DexieProductRepository } from '../../../data-access/repositories/dexie-product.repository';
import { ActiveOperatorService } from '../../services/active-operator.service';

export interface SaveProductInput { readonly id?: string; readonly name: string; readonly selling_price: number; readonly category_id: string; }

@Injectable({ providedIn: 'root' })
export class SaveProductUseCase {
  private readonly repository = inject(DexieProductRepository);
  private readonly activeOperator = inject(ActiveOperatorService);
  async execute(input: SaveProductInput): Promise<Product> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error('An active operator is required.');
    const name = input.name.trim();
    if (!name || name.length > 100) throw new Error('Product name must be between 1 and 100 characters.');
    if (!input.category_id) throw new Error('A category is required.');
    if (!Number.isInteger(input.selling_price) || input.selling_price < 0) throw new Error('Selling price must be a non-negative number of cents.');
    const existing = input.id ? await this.repository.getById(input.id) : undefined;
    const now = new Date();
    const product: Product = {
      id: existing?.id ?? crypto.randomUUID(), name, selling_price: input.selling_price,
      quantity: existing?.quantity ?? 0, category_id: input.category_id,
      created_by_operator_id: existing?.created_by_operator_id ?? operator.id,
      last_modified_by_operator_id: operator.id, created_at: existing?.created_at ?? now, updated_at: now,
    };
    await this.repository.save(product);
    return product;
  }
}
