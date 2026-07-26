import { inject, Injectable } from '@angular/core';
import { InventoryBatch } from '../../../domain/models/inventory-batch.model';
import { InventoryMovement } from '../../../domain/models/inventory-movement.model';
import { Product } from '../../../domain/models/product.model';
import { DexieInventoryBatchRepository } from '../../../data-access/repositories/dexie-inventory-batch.repository';
import { DexieInventoryMovementRepository } from '../../../data-access/repositories/dexie-inventory-movement.repository';
import { DexieProductRepository } from '../../../data-access/repositories/dexie-product.repository';
import { InventoryIntegrityService } from '../../services/inventory-integrity.service';

export interface ProductInventory { readonly product: Product; readonly batches: readonly InventoryBatch[]; readonly movements: readonly InventoryMovement[]; }

@Injectable({ providedIn: 'root' })
export class GetProductInventoryUseCase {
  private readonly products = inject(DexieProductRepository); private readonly batches = inject(DexieInventoryBatchRepository); private readonly movements = inject(DexieInventoryMovementRepository); private readonly integrity = inject(InventoryIntegrityService);
  async execute(productId: string): Promise<ProductInventory | undefined> {
    const product = await this.products.getById(productId); if (!product) return undefined; await this.integrity.assertConsistent(product);
    const [batches, movements] = await Promise.all([this.batches.listByProduct(productId), this.movements.listByProduct(productId)]);
    return { product, batches, movements };
  }
}
