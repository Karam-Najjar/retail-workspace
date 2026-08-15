import { inject, Injectable } from "@angular/core";
import { AppMetadata } from "../../domain/models/app-metadata.model";
import { Operator } from "../../domain/models/operator.model";
import { Settings } from "../../domain/models/settings.model";
import { Category } from "../../domain/models/category.model";
import { APP_SETTINGS_KEY, CURRENT_SCHEMA_VERSION, OPERATOR_ONE_ID, OPERATOR_TWO_ID } from "./database.constants";
import { RetailDatabase } from "./retail.database";

@Injectable({ providedIn: "root" })
export class DatabaseInitializerService {
  private readonly database = inject(RetailDatabase);

  async initialize(): Promise<void> {
    await this.migrateCurrencyPrecisionIfNeeded();
    await this.database.transaction(
      "rw",
      this.database.operators,
      this.database.settings,
      this.database.app_metadata,
      this.database.categories,
      async () => {
        const now = new Date();
        const systemCategory: Category = {
          id: "category-system-other",
          name: "Other",
          system_code: "other",
          created_by_operator_id: OPERATOR_ONE_ID,
          last_modified_by_operator_id: OPERATOR_ONE_ID,
          created_at: now,
          updated_at: now,
        };
        const existingOperators = await this.database.operators.count();

        if (existingOperators === 0) {
          const operators: readonly Operator[] = [
            { id: OPERATOR_ONE_ID, slot: 1, display_name: "User 1", created_at: now, updated_at: now },
            { id: OPERATOR_TWO_ID, slot: 2, display_name: "User 2", created_at: now, updated_at: now },
          ];
          await this.database.operators.bulkAdd(operators);
        }

        const settings = await this.database.settings.get(APP_SETTINGS_KEY);
        if (!settings) {
          const initialSettings: Settings = {
            _singleton_key: APP_SETTINGS_KEY,
            active_operator_id: OPERATOR_ONE_ID,
            currency_rate: "13300",
            low_stock_threshold: 5,
            language: "en",
            last_backup_date: null,
            last_modified_by_operator_id: OPERATOR_ONE_ID,
            store_name_en: "",
            store_name_ar: "",
          };
          await this.database.settings.add(initialSettings);
        }

        const schemaMetadata: AppMetadata = { key: "schema_version", value: CURRENT_SCHEMA_VERSION, updated_at: now };
        await this.database.app_metadata.put(schemaMetadata);

        if (!(await this.database.app_metadata.get("app_version"))) {
          const appVersionMetadata: AppMetadata = { key: "app_version", value: "1.0.0", updated_at: now };
          await this.database.app_metadata.add(appVersionMetadata);
        }
        if (!(await this.database.categories.where("system_code").equals("other").first())) {
          await this.database.categories.add(systemCategory);
        }
      }
    );
  }

  private async migrateCurrencyPrecisionIfNeeded(): Promise<void> {
    const precisionKey = "currency_precision";
    const existing = await this.database.app_metadata.get(precisionKey);
    if (existing?.value === "4") return;

    const MULTIPLIER = 100;

    await this.database.transaction("rw", this.database.tables, async () => {
      // Products
      const products = await this.database.products.toArray();
      await this.database.products.bulkPut(products.map(product => ({ ...product, selling_price: product.selling_price * MULTIPLIER })));

      // Inventory batches
      const batches = await this.database.inventoryBatches.toArray();
      await this.database.inventoryBatches.bulkPut(
        batches.map(batch => ({
          ...batch,
          original_total_cost: batch.original_total_cost * MULTIPLIER,
          remaining_total_cost: batch.remaining_total_cost * MULTIPLIER,
          unit_cost_display:
            batch.original_quantity > 0
              ? ((batch.original_total_cost * MULTIPLIER) / batch.original_quantity / 10000).toFixed(4)
              : batch.unit_cost_display,
        }))
      );

      // Supplies
      const supplies = await this.database.supplies.toArray();
      await this.database.supplies.bulkPut(
        supplies.map(supply => ({
          ...supply,
          total_cost: supply.total_cost * MULTIPLIER,
          currency_snapshot: supply.currency_snapshot ? { ...supply.currency_snapshot, primary_precision: 4 } : supply.currency_snapshot,
        }))
      );

      // Supply items
      const supplyItems = await this.database.supplyItems.toArray();
      await this.database.supplyItems.bulkPut(
        supplyItems.map(item => ({
          ...item,
          unit_cost_entered: item.unit_cost_entered * MULTIPLIER,
          subtotal_cost: item.subtotal_cost * MULTIPLIER,
          unit_cost_per_base_display:
            item.quantity_base_units > 0
              ? ((item.subtotal_cost * MULTIPLIER) / item.quantity_base_units / 10000).toFixed(4)
              : item.unit_cost_per_base_display,
        }))
      );

      // Sales
      const sales = await this.database.sales.toArray();
      await this.database.sales.bulkPut(
        sales.map(sale => ({
          ...sale,
          total_amount: sale.total_amount * MULTIPLIER,
          total_cost: sale.total_cost * MULTIPLIER,
          total_profit: sale.total_profit * MULTIPLIER,
          currency_snapshot: sale.currency_snapshot ? { ...sale.currency_snapshot, primary_precision: 4 } : sale.currency_snapshot,
        }))
      );

      // Sale items
      const saleItems = await this.database.saleItems.toArray();
      await this.database.saleItems.bulkPut(
        saleItems.map(item => ({
          ...item,
          default_selling_price_per_unit: item.default_selling_price_per_unit * MULTIPLIER,
          selling_price_per_unit: item.selling_price_per_unit * MULTIPLIER,
          subtotal_amount: item.subtotal_amount * MULTIPLIER,
          total_cost: item.total_cost * MULTIPLIER,
          total_profit: item.total_profit * MULTIPLIER,
        }))
      );

      // Allocations
      const allocations = await this.database.saleItemBatchAllocations.toArray();
      await this.database.saleItemBatchAllocations.bulkPut(
        allocations.map(allocation => ({ ...allocation, allocated_cost: allocation.allocated_cost * MULTIPLIER }))
      );

      // Draft carts
      const carts = await this.database.draftCarts.toArray();
      await this.database.draftCarts.bulkPut(
        carts.map(cart => ({
          ...cart,
          items: cart.items.map(item => ({
            ...item,
            default_selling_price_per_unit: item.default_selling_price_per_unit * MULTIPLIER,
            selling_price_per_unit: item.selling_price_per_unit * MULTIPLIER,
          })),
        }))
      );

      // Mark migrated
      await this.database.app_metadata.put({
        key: precisionKey,
        value: "4",
        updated_at: new Date(),
      });
    });
  }
}
