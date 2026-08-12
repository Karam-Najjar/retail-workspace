import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { InventoryAdjustment } from "../../../domain/models/inventory-adjustment.model";
import { InventoryBatch } from "../../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../../domain/models/inventory-movement.model";
import { InventoryStockAddedEventPayload } from "../../../domain/events/inventory-event.payload";
import { DexieInventoryAdjustmentRepository } from "../../../data-access/repositories/dexie-inventory-adjustment.repository";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";
import { InventoryIntegrityService } from "../../services/inventory-integrity.service";

export interface AdjustStockInInput {
  readonly productId: string;
  readonly quantity: number;
  readonly unitCostCents: number;
  readonly reason?: string;
}

@Injectable({ providedIn: "root" })
export class AdjustStockInUseCase {
  private readonly products = inject(DexieProductRepository);
  private readonly adjustments = inject(DexieInventoryAdjustmentRepository);
  private readonly activeOperator = inject(ActiveOperatorService);
  private readonly integrity = inject(InventoryIntegrityService);
  async execute(input: AdjustStockInInput): Promise<InventoryBatch> {
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be a positive whole number.");
    if (!Number.isSafeInteger(input.unitCostCents) || input.unitCostCents <= 0) throw new Error("Unit cost must be greater than zero.");
    const product = await this.products.getById(input.productId);
    if (!product) throw new Error("Product could not be found.");
    await this.integrity.assertConsistent(product);
    if (product.quantity <= 0) throw new Error("Stock adjustment is only available when stock is positive.");
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");
    const now = new Date();
    const adjustmentId = crypto.randomUUID();
    const batchId = crypto.randomUUID();
    const totalCost = input.quantity * input.unitCostCents;
    if (!Number.isSafeInteger(totalCost)) throw new Error("Inventory cost is too large.");
    const reason = input.reason?.trim() || null;
    const adjustment: InventoryAdjustment = {
      id: adjustmentId,
      date: now,
      type: "adjustment_in",
      product_id: product.id,
      quantity_change: input.quantity,
      unit_cost: (input.unitCostCents / 100).toFixed(4),
      operator_id: operator.id,
      operator_name: operator.display_name,
      reason,
      created_at: now,
    };
    const batch: Omit<InventoryBatch, "sequence"> = {
      id: batchId,
      product_id: product.id,
      source_type: "adjustment",
      source_id: adjustmentId,
      original_quantity: input.quantity,
      remaining_quantity: input.quantity,
      original_total_cost: totalCost,
      remaining_total_cost: totalCost,
      unit_cost_display: (input.unitCostCents / 100).toFixed(4),
      created_at: now,
    };
    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      product_id: product.id,
      type: "adjustment_in",
      quantity_change: input.quantity,
      batch_id: batchId,
      sale_id: null,
      supply_id: null,
      adjustment_id: adjustmentId,
      operator_id: operator.id,
      operator_name: operator.display_name,
      reason,
      created_at: now,
    };
    const payload: InventoryStockAddedEventPayload = {
      product_id: product.id,
      quantity: input.quantity,
      unit_cost_cents: input.unitCostCents,
      total_cost_cents: totalCost,
      adjustment_id: adjustmentId,
      batch_id: batchId,
    };
    const activityLog: ActivityLog<"inventory.stock.added"> = {
      id: crypto.randomUUID(),
      event_code: "inventory.stock.added",
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
    return this.adjustments.applyPositive({ product, adjustment, batch, movement, activityLog });
  }
}
