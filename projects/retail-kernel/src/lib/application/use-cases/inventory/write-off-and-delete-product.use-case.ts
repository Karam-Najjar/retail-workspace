import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { InventoryAdjustment } from "../../../domain/models/inventory-adjustment.model";
import { InventoryMovement } from "../../../domain/models/inventory-movement.model";
import { InventoryWriteOffEventPayload } from "../../../domain/events/inventory-event.payload";
import { DexieInventoryAdjustmentRepository } from "../../../data-access/repositories/dexie-inventory-adjustment.repository";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";
import { InventoryIntegrityService } from "../../services/inventory-integrity.service";

export interface WriteOffAndDeleteProductInput {
  readonly productId: string;
  readonly reason: string;
}

@Injectable({ providedIn: "root" })
export class WriteOffAndDeleteProductUseCase {
  private readonly products = inject(DexieProductRepository);
  private readonly adjustments = inject(DexieInventoryAdjustmentRepository);
  private readonly activeOperator = inject(ActiveOperatorService);
  private readonly integrity = inject(InventoryIntegrityService);
  async execute(input: WriteOffAndDeleteProductInput): Promise<readonly InventoryMovement[]> {
    const reason = input.reason.trim();
    if (!reason) throw new Error("A reason is required to write off and delete a product.");
    const product = await this.products.getById(input.productId);
    if (!product) throw new Error("Product could not be found.");
    await this.integrity.assertConsistent(product);
    if (product.quantity <= 0) throw new Error("Products without stock must be deleted normally.");
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");
    const now = new Date();
    const adjustmentId = crypto.randomUUID();
    const adjustment: InventoryAdjustment = {
      id: adjustmentId,
      date: now,
      type: "write_off",
      product_id: product.id,
      quantity_change: -product.quantity,
      unit_cost: null,
      operator_id: operator.id,
      operator_name: operator.display_name,
      reason,
      created_at: now,
    };
    const payload: InventoryWriteOffEventPayload = { product_id: product.id, quantity: product.quantity, adjustment_id: adjustmentId, reason };
    const activityLog: ActivityLog<InventoryWriteOffEventPayload> = {
      id: crypto.randomUUID(),
      event_code: "inventory.product.written_off",
      entity_type: "product",
      entity_id: product.id,
      entity_name_snapshot: product.name,
      payload,
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: now,
    };
    return this.adjustments.writeOffAndDelete({ product, adjustment, quantity: product.quantity, activityLog });
  }
}
