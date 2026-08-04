import { inject, Injectable } from "@angular/core";
import Decimal from "decimal.js";
import { StoreProfileService } from "../../../configuration/store-profile.service";
import { DexieProductRepository } from "../../../data-access/repositories/dexie-product.repository";
import { DexieSupplierRepository } from "../../../data-access/repositories/dexie-supplier.repository";
import { DexieSupplyRepository } from "../../../data-access/repositories/dexie-supply.repository";
import { ActivityLog } from "../../../domain/models/activity-log.model";
import { InventoryBatch } from "../../../domain/models/inventory-batch.model";
import { InventoryMovement } from "../../../domain/models/inventory-movement.model";
import { SupplyItem } from "../../../domain/models/supply-item.model";
import { Supply } from "../../../domain/models/supply.model";
import { SupplyReceivedPayload } from "../../../domain/events/supply-received.payload";
import { SupplyReceiptEntry } from "../../../domain/repository-contracts/supply.repository";
import { ActiveOperatorService } from "../../services/active-operator.service";
import { CurrencyService } from "../../services/currency.service";
import { InventoryIntegrityService } from "../../services/inventory-integrity.service";

export interface ReceiveSupplyLineInput {
  readonly productId: string;
  readonly packageTypeCode: string;
  readonly quantityReceived: number;
  readonly unitCostEntered: number;
}

export interface ReceiveSupplyInput {
  readonly supplierId: string;
  readonly date: Date;
  readonly lines: readonly ReceiveSupplyLineInput[];
}

@Injectable({ providedIn: "root" })
export class ReceiveSupplyUseCase {
  private readonly supplies = inject(DexieSupplyRepository);
  private readonly suppliers = inject(DexieSupplierRepository);
  private readonly products = inject(DexieProductRepository);
  private readonly operatorService = inject(ActiveOperatorService);
  private readonly profileService = inject(StoreProfileService);
  private readonly currency = inject(CurrencyService);
  private readonly integrity = inject(InventoryIntegrityService);

  async execute(input: ReceiveSupplyInput): Promise<Supply> {
    if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) throw new Error("A valid supply date is required.");
    if (input.date.getTime() > Date.now()) throw new Error("Supply date cannot be in the future.");
    if (!input.lines.length) throw new Error("Add at least one product to the supply.");
    const supplier = await this.suppliers.getById(input.supplierId);
    if (!supplier) throw new Error("Supplier is required.");
    const operator = this.operatorService.activeOperator();
    if (!operator) throw new Error("An active operator is required.");

    const supplyId = crypto.randomUUID();
    const createdAt = new Date();
    const entries: SupplyReceiptEntry[] = [];
    let totalCost = 0;
    for (const line of input.lines) {
      if (!Number.isSafeInteger(line.quantityReceived) || line.quantityReceived <= 0)
        throw new Error("Package quantity must be a positive whole number.");
      if (!Number.isSafeInteger(line.unitCostEntered) || line.unitCostEntered <= 0) throw new Error("Cost per package must be greater than zero.");
      const packageType = this.profileService.profile.package_types.find(item => item.code === line.packageTypeCode);
      if (!packageType) throw new Error("Select a valid package type.");
      const product = await this.products.getById(line.productId);
      if (!product) throw new Error("Select a valid product.");
      await this.integrity.assertConsistent(product);
      const quantityBaseUnits = line.quantityReceived * packageType.multiplier;
      const subtotalCost = line.quantityReceived * line.unitCostEntered;
      if (!Number.isSafeInteger(quantityBaseUnits) || !Number.isSafeInteger(subtotalCost)) throw new Error("Supply line value is too large.");
      totalCost += subtotalCost;
      if (!Number.isSafeInteger(totalCost)) throw new Error("Supply total is too large.");
      const itemId = crypto.randomUUID();
      const batchId = crypto.randomUUID();
      const item: SupplyItem = {
        id: itemId,
        supply_id: supplyId,
        product_id: product.id,
        product_name: product.name,
        package_type_code: packageType.code,
        quantity_received: line.quantityReceived,
        multiplier: packageType.multiplier,
        quantity_base_units: quantityBaseUnits,
        unit_cost_entered: line.unitCostEntered,
        unit_cost_per_base_display: new Decimal(line.unitCostEntered).div(packageType.multiplier).div(100).toString(),
        subtotal_cost: subtotalCost,
      };
      const batch: Omit<InventoryBatch, "sequence"> = {
        id: batchId,
        product_id: product.id,
        source_type: "supply",
        source_id: itemId,
        original_quantity: quantityBaseUnits,
        remaining_quantity: quantityBaseUnits,
        original_total_cost: subtotalCost,
        remaining_total_cost: subtotalCost,
        unit_cost_display: item.unit_cost_per_base_display,
        created_at: input.date,
      };
      const movement: InventoryMovement = {
        id: crypto.randomUUID(),
        product_id: product.id,
        type: "supply",
        quantity_change: quantityBaseUnits,
        batch_id: batchId,
        sale_id: null,
        supply_id: supplyId,
        adjustment_id: null,
        operator_id: operator.id,
        operator_name: operator.display_name,
        reason: null,
        created_at: input.date,
      };
      entries.push({ product, item, batch, movement });
    }

    const supply: Supply = {
      id: supplyId,
      date: input.date,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      total_cost: totalCost,
      operator_id: operator.id,
      operator_name: operator.display_name,
      currency_snapshot: await this.currency.createSupplySnapshot(totalCost),
      created_at: createdAt,
    };
    const payload: SupplyReceivedPayload = {
      supply_id: supply.id,
      supplier_id: supplier.id,
      item_count: entries.length,
      total_cost: totalCost,
      lines: entries.map(entry => ({
        supply_item_id: entry.item.id,
        product_id: entry.product.id,
        quantity_base_units: entry.item.quantity_base_units,
        subtotal_cost: entry.item.subtotal_cost,
        batch_id: entry.batch.id,
      })),
    };
    const activityLog: ActivityLog<"supply.received"> = {
      id: crypto.randomUUID(),
      event_code: "supply.received",
      entity_type: "supply",
      entity_id: supply.id,
      entity_name_snapshot: supplier.name,
      payload,
      operator_id: operator.id,
      operator_name: operator.display_name,
      related_sale_id: null,
      related_supply_id: supply.id,
      created_at: createdAt,
    };
    await this.supplies.receive({ supply, entries, activityLog });
    return supply;
  }
}
