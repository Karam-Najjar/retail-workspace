import { inject, Injectable } from "@angular/core";
import { ActivityLog } from "../../domain/models/activity-log.model";
import { InventoryAdjustment } from "../../domain/models/inventory-adjustment.model";
import { InventoryBatch } from "../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../domain/models/inventory-movement.model";
import { ProductBarcode } from "../../domain/models/product-barcode.model";
import { Product } from "../../domain/models/product.model";
import { RetailDatabase } from "../database/retail.database";

export interface PosProductCreationRecords {
  readonly product: Product;
  readonly barcode: ProductBarcode;
  readonly adjustment: InventoryAdjustment;
  readonly batch: InventoryBatch;
  readonly movement: InventoryMovement;
  readonly activityLog: ActivityLog;
}

export interface PosProductCreationResult {
  readonly product: Product;
  readonly barcode: ProductBarcode;
}

@Injectable({ providedIn: "root" })
export class DexiePosProductCreationRepository {
  private readonly database = inject(RetailDatabase);

  create(records: PosProductCreationRecords): Promise<PosProductCreationResult> {
    return this.database.transaction(
      "rw",
      [
        this.database.products,
        this.database.productBarcodes,
        this.database.categories,
        this.database.inventoryAdjustments,
        this.database.inventoryBatches,
        this.database.inventoryMovements,
        this.database.activity_logs,
      ],
      async () => {
        const [existingProduct, category, conflictingBarcode] = await Promise.all([
          this.database.products.get(records.product.id),
          this.database.categories.get(records.product.category_id),
          this.database.productBarcodes.where("normalized_barcode").equals(records.barcode.normalized_barcode).first(),
        ]);

        if (existingProduct) throw new Error("A product with this identifier already exists.");
        if (!category) throw new Error("Select a valid category.");
        if (conflictingBarcode) throw new Error("Barcode is already assigned to another product.");

        const stockedProduct: Product = {
          ...records.product,
          quantity: records.batch.remaining_quantity,
        };

        await this.database.products.add(records.product);
        await this.database.productBarcodes.add(records.barcode);
        await this.database.inventoryAdjustments.add(records.adjustment);
        await this.database.inventoryBatches.add(records.batch);
        await this.database.inventoryMovements.add(records.movement);
        await this.database.products.put(stockedProduct);
        await this.database.activity_logs.add(records.activityLog);

        const batches = await this.database.inventoryBatches.where("product_id").equals(stockedProduct.id).toArray();
        const storedQuantity = batches.reduce((total, batch) => total + batch.remaining_quantity, 0);
        if (storedQuantity !== stockedProduct.quantity) {
          console.error(`Inventory integrity failure for product ${stockedProduct.id}: cached=${stockedProduct.quantity}, batches=${storedQuantity}`);
          throw new Error("Inventory integrity check failed. Product creation was cancelled.");
        }

        return { product: stockedProduct, barcode: records.barcode };
      }
    );
  }
}
