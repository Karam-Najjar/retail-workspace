import { inject, Injectable } from '@angular/core';
import { InventoryMovement } from '../../domain/models/inventory-movement.model';
import { InventoryMovementRepository } from '../../domain/repository-contracts/inventory-movement.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieInventoryMovementRepository implements InventoryMovementRepository {
  private readonly database = inject(RetailDatabase);

  async listByProduct(productId: string): Promise<readonly InventoryMovement[]> {
    const movements = await this.database.inventoryMovements.where('product_id').equals(productId).toArray();
    return movements.sort((left, right) => right.created_at.getTime() - left.created_at.getTime());
  }
}
