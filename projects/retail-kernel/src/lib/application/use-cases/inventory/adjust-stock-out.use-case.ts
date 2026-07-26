import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../../domain/models/activity-log.model';
import { InventoryAdjustment } from '../../../domain/models/inventory-adjustment.model';
import { InventoryMovement } from '../../../domain/models/inventory-movement.model';
import { InventoryStockRemovedEventPayload } from '../../../domain/events/inventory-event.payload';
import { DexieInventoryAdjustmentRepository } from '../../../data-access/repositories/dexie-inventory-adjustment.repository';
import { DexieProductRepository } from '../../../data-access/repositories/dexie-product.repository';
import { ActiveOperatorService } from '../../services/active-operator.service';
import { InventoryIntegrityService } from '../../services/inventory-integrity.service';

export interface AdjustStockOutInput { readonly productId: string; readonly quantity: number; readonly reason?: string; }

@Injectable({ providedIn: 'root' })
export class AdjustStockOutUseCase {
  private readonly products = inject(DexieProductRepository); private readonly adjustments = inject(DexieInventoryAdjustmentRepository); private readonly activeOperator = inject(ActiveOperatorService); private readonly integrity = inject(InventoryIntegrityService);
  async execute(input: AdjustStockOutInput): Promise<readonly InventoryMovement[]> {
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    const product = await this.products.getById(input.productId); if (!product) throw new Error('Product could not be found.'); await this.integrity.assertConsistent(product); if (input.quantity > product.quantity) throw new Error('Stock cannot be reduced below zero.');
    const operator = this.activeOperator.activeOperator(); if (!operator) throw new Error('An active operator is required.');
    const now = new Date(); const adjustmentId = crypto.randomUUID(); const reason = input.reason?.trim() || null;
    const adjustment: InventoryAdjustment = { id: adjustmentId, date: now, type: 'adjustment_out', product_id: product.id, quantity_change: -input.quantity, unit_cost: null, operator_id: operator.id, operator_name: operator.display_name, reason, created_at: now };
    const payload: InventoryStockRemovedEventPayload = { product_id: product.id, quantity: input.quantity, adjustment_id: adjustmentId };
    const activityLog: ActivityLog<InventoryStockRemovedEventPayload> = { id: crypto.randomUUID(), event_code: 'inventory.stock.removed', entity_type: 'product', entity_id: product.id, entity_name_snapshot: product.name, payload, operator_id: operator.id, operator_name: operator.display_name, related_sale_id: null, related_supply_id: null, created_at: now };
    return this.adjustments.applyNegative({ product, adjustment, quantity: input.quantity, activityLog });
  }
}
