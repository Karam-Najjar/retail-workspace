import { inject, Injectable } from '@angular/core';
import { Product } from '../../domain/models/product.model';
import { DexieInventoryBatchRepository } from '../../data-access/repositories/dexie-inventory-batch.repository';

@Injectable({ providedIn: 'root' })
export class InventoryIntegrityService {
  private readonly batches = inject(DexieInventoryBatchRepository);

  async assertConsistent(product: Product): Promise<void> {
    const batchQuantity = await this.batches.sumRemainingQuantity(product.id);
    if (product.quantity !== batchQuantity) {
      console.error(`Inventory integrity failure for product ${product.id}: cached=${product.quantity}, batches=${batchQuantity}`);
      throw new Error('Inventory integrity check failed. Further stock changes are blocked.');
    }
  }
}
