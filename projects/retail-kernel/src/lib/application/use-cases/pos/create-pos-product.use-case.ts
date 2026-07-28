import { inject, Injectable } from "@angular/core";
import { DexiePosProductCreationRepository, PosProductCreationResult } from "../../../data-access/repositories/dexie-pos-product-creation.repository";
import { DexieCategoryRepository } from "../../../data-access/repositories/dexie-category.repository";
import { InventoryStockAddedEventPayload } from "../../../domain/events/inventory-event.payload";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { InventoryAdjustment } from "../../../domain/models/inventory-adjustment.model";
import { InventoryBatch } from "../../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../../domain/models/inventory-movement.model";
import { ProductBarcode } from "../../../domain/models/product-barcode.model";
import { Product } from "../../../domain/models/product.model";
import { ActiveOperatorService } from "../../services/active-operator.service";
import { normalizeBarcode, validateBarcode } from "../../validators/barcode.validator";

export interface CreatePosProductInput {
  readonly barcode: string;
  readonly name: string;
  readonly sellingPriceCents: number;
  readonly categoryId?: string;
  readonly openingQuantity: number;
  readonly unitCostCents: number;
}

@Injectable({ providedIn: "root" })
export class CreatePosProductUseCase {
  private readonly repository = inject(DexiePosProductCreationRepository);
  private readonly categories = inject(DexieCategoryRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(input: CreatePosProductInput): Promise<PosProductCreationResult> {
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error("An active operator is required.");

    const name = input.name.trim();
    if (!name) throw new Error("Product name is required.");
    if (name.length > 100) throw new Error("Product name must be 100 characters or fewer.");
    if (!Number.isSafeInteger(input.sellingPriceCents) || input.sellingPriceCents <= 0) {
      throw new Error("Selling price must be greater than zero.");
    }
    if (!Number.isSafeInteger(input.openingQuantity) || input.openingQuantity <= 0) {
      throw new Error("Opening quantity must be a positive whole number.");
    }
    if (!Number.isSafeInteger(input.unitCostCents) || input.unitCostCents <= 0) {
      throw new Error("Unit cost must be greater than zero.");
    }

    const barcodeValue = validateBarcode(input.barcode);
    const categoryId = await this.resolveCategoryId(input.categoryId);
    const totalCost = input.openingQuantity * input.unitCostCents;
    if (!Number.isSafeInteger(totalCost)) throw new Error("Inventory cost is too large.");

    const now = new Date();
    const productId = crypto.randomUUID();
    const barcodeId = crypto.randomUUID();
    const adjustmentId = crypto.randomUUID();
    const batchId = crypto.randomUUID();
    const unitCostDisplay = (input.unitCostCents / 100).toFixed(2);
    const product: Product = {
      id: productId,
      name,
      selling_price: input.sellingPriceCents,
      quantity: 0,
      category_id: categoryId,
      created_by_operator_id: operator.id,
      last_modified_by_operator_id: operator.id,
      created_at: now,
      updated_at: now,
    };
    const barcode: ProductBarcode = {
      id: barcodeId,
      product_id: productId,
      barcode: barcodeValue,
      normalized_barcode: normalizeBarcode(barcodeValue),
      package_type_code: "pocket",
      multiplier: 1,
    };
    const adjustment: InventoryAdjustment = {
      id: adjustmentId,
      date: now,
      type: "opening_balance",
      product_id: productId,
      quantity_change: input.openingQuantity,
      unit_cost: unitCostDisplay,
      operator_id: operator.id,
      operator_name: operator.display_name,
      reason: null,
      created_at: now,
    };
    const batch: InventoryBatch = {
      id: batchId,
      product_id: productId,
      source_type: "opening_balance",
      source_id: adjustmentId,
      original_quantity: input.openingQuantity,
      remaining_quantity: input.openingQuantity,
      original_total_cost: totalCost,
      remaining_total_cost: totalCost,
      unit_cost_display: unitCostDisplay,
      sequence: 1,
      created_at: now,
    };
    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      product_id: productId,
      type: "opening_balance",
      quantity_change: input.openingQuantity,
      batch_id: batchId,
      sale_id: null,
      supply_id: null,
      adjustment_id: adjustmentId,
      operator_id: operator.id,
      operator_name: operator.display_name,
      reason: null,
      created_at: now,
    };
    const payload: InventoryStockAddedEventPayload = {
      product_id: productId,
      quantity: input.openingQuantity,
      unit_cost_cents: input.unitCostCents,
      total_cost_cents: totalCost,
      adjustment_id: adjustmentId,
      batch_id: batchId,
    };
    const activityLog: ActivityLog<InventoryStockAddedEventPayload> = {
      id: crypto.randomUUID(),
      event_code: "inventory.opening_balance.created",
      entity_type: "product",
      entity_id: productId,
      entity_name_snapshot: name,
      payload,
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: null,
      created_at: now,
    };

    return this.repository.create({
      product,
      barcode,
      adjustment,
      batch,
      movement,
      activityLog,
    });
  }

  private async resolveCategoryId(categoryId: string | undefined): Promise<string> {
    const requestedId = categoryId?.trim();
    if (requestedId) return requestedId;
    const categories = await this.categories.list();
    const other = categories.find(category => category.system_code === "other");
    if (!other) throw new Error("The default category could not be found.");
    return other.id;
  }
}
