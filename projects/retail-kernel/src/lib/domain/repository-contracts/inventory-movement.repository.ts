import { InventoryMovement } from "../models/inventory-movement.model";

export interface InventoryMovementRepository {
  listByProduct(productId: string): Promise<readonly InventoryMovement[]>;
}
