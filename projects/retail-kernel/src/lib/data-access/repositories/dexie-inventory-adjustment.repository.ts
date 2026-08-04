import { inject, Injectable } from "@angular/core";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../domain/models/inventory-movement.model";
import { allocateFifo, assertValidInventoryBatch, checkedAddSafeIntegers } from "../../domain/policies/fifo-allocation.policy";
import {
  InventoryAdjustmentRepository,
  NegativeInventoryChange,
  PositiveInventoryChange,
} from "../../domain/repository-contracts/inventory-adjustment.repository";
import { RetailDatabase } from "../database/retail.database";

@Injectable({ providedIn: "root" })
export class DexieInventoryAdjustmentRepository implements InventoryAdjustmentRepository {
  private readonly database = inject(RetailDatabase);

  applyPositive(change: PositiveInventoryChange): Promise<InventoryBatch> {
    return this.database.transaction(
      "rw",
      this.database.products,
      this.database.inventoryBatches,
      this.database.inventoryMovements,
      this.database.inventoryAdjustments,
      this.database.activity_logs,
      async () => {
        const product = await this.requireConsistentProduct(change.product.id, change.product.quantity);
        if (change.adjustment.type === "opening_balance" && product.quantity !== 0) {
          throw new Error("Opening balance is only available when stock is zero.");
        }

        const existingBatches = await this.database.inventoryBatches.where("product_id").equals(product.id).toArray();
        for (const existingBatch of existingBatches) assertValidInventoryBatch(existingBatch);
        const maximumSequence = existingBatches.reduce((maximum, batch) => Math.max(maximum, batch.sequence), 0);
        const sequence = checkedAddSafeIntegers(maximumSequence, 1, "Inventory batch sequence is too large.");
        const batch: InventoryBatch = { ...change.batch, sequence };
        assertValidInventoryBatch(batch);
        const quantity = change.adjustment.quantity_change;
        const updatedProduct = {
          ...product,
          quantity: checkedAddSafeIntegers(product.quantity, quantity, "Product quantity is too large."),
          last_modified_by_operator_id: change.adjustment.operator_id,
          updated_at: change.adjustment.created_at,
        };
        const movement: InventoryMovement = { ...change.movement, batch_id: batch.id };

        await this.database.inventoryAdjustments.add(change.adjustment);
        await this.database.inventoryBatches.add(batch);
        await this.database.inventoryMovements.add(movement);
        await this.database.products.put(updatedProduct);
        await this.database.activity_logs.add(change.activityLog);
        await this.assertStoredQuantity(product.id, updatedProduct.quantity);
        return batch;
      }
    );
  }

  applyNegative(change: NegativeInventoryChange): Promise<readonly InventoryMovement[]> {
    return this.database.transaction(
      "rw",
      this.database.products,
      this.database.inventoryBatches,
      this.database.inventoryMovements,
      this.database.inventoryAdjustments,
      this.database.activity_logs,
      async () => {
        const product = await this.requireConsistentProduct(change.product.id, change.product.quantity);
        const batches = await this.database.inventoryBatches.where("product_id").equals(product.id).toArray();
        const result = allocateFifo(batches, change.quantity);
        const movements = this.createMovements(change, result.allocations);
        const updatedProduct = {
          ...product,
          quantity: checkedAddSafeIntegers(product.quantity, -change.quantity, "Product quantity is invalid."),
          last_modified_by_operator_id: change.adjustment.operator_id,
          updated_at: change.adjustment.created_at,
        };

        await this.database.inventoryAdjustments.add(change.adjustment);
        await this.database.inventoryBatches.bulkPut(result.allocations.map(allocation => allocation.batch));
        await this.database.inventoryMovements.bulkAdd([...movements]);
        await this.database.products.put(updatedProduct);
        await this.database.activity_logs.add(change.activityLog);
        await this.assertStoredQuantity(product.id, updatedProduct.quantity);
        return movements;
      }
    );
  }

  writeOffAndDelete(change: NegativeInventoryChange): Promise<readonly InventoryMovement[]> {
    return this.database.transaction(
      "rw",
      [
        this.database.products,
        this.database.productBarcodes,
        this.database.inventoryBatches,
        this.database.inventoryMovements,
        this.database.inventoryAdjustments,
        this.database.activity_logs,
      ],
      async () => {
        const product = await this.requireConsistentProduct(change.product.id, change.product.quantity);
        if (product.quantity <= 0 || change.quantity !== product.quantity) {
          throw new Error("Write off requires all remaining product stock.");
        }

        const batches = await this.database.inventoryBatches.where("product_id").equals(product.id).toArray();
        const result = allocateFifo(batches, product.quantity);
        const movements = this.createMovements(change, result.allocations);

        await this.database.inventoryAdjustments.add(change.adjustment);
        await this.database.inventoryBatches.bulkPut(result.allocations.map(allocation => allocation.batch));
        await this.database.inventoryMovements.bulkAdd([...movements]);
        await this.database.productBarcodes.where("product_id").equals(product.id).delete();
        await this.database.products.delete(product.id);
        await this.database.activity_logs.add(change.activityLog);
        return movements;
      }
    );
  }

  private async requireConsistentProduct(productId: string, expectedQuantity: number) {
    const product = await this.database.products.get(productId);
    if (!product) throw new Error("Product could not be found.");
    if (product.quantity !== expectedQuantity) throw new Error("Product stock changed. Reload and try again.");
    await this.assertStoredQuantity(product.id, product.quantity);
    return product;
  }

  private async assertStoredQuantity(productId: string, expectedQuantity: number): Promise<void> {
    if (!Number.isSafeInteger(expectedQuantity) || expectedQuantity < 0) {
      throw new Error("Inventory integrity check failed. Further stock changes are blocked.");
    }
    const batches = await this.database.inventoryBatches.where("product_id").equals(productId).toArray();
    for (const batch of batches) assertValidInventoryBatch(batch);
    const actualQuantity = batches.reduce(
      (sum, batch) => checkedAddSafeIntegers(sum, batch.remaining_quantity, "Inventory quantity is too large."),
      0
    );
    if (actualQuantity !== expectedQuantity) {
      console.error(`Inventory integrity failure for product ${productId}: cached=${expectedQuantity}, batches=${actualQuantity}`);
      throw new Error("Inventory integrity check failed. Further stock changes are blocked.");
    }
  }

  private createMovements(
    change: NegativeInventoryChange,
    allocations: ReturnType<typeof allocateFifo>["allocations"]
  ): readonly InventoryMovement[] {
    return allocations.map(allocation => ({
      id: crypto.randomUUID(),
      product_id: change.product.id,
      type: change.adjustment.type,
      quantity_change: -allocation.quantity,
      batch_id: allocation.batch.id,
      sale_id: null,
      supply_id: null,
      adjustment_id: change.adjustment.id,
      operator_id: change.adjustment.operator_id,
      operator_name: change.adjustment.operator_name,
      reason: change.adjustment.reason,
      created_at: change.adjustment.created_at,
    }));
  }
}
