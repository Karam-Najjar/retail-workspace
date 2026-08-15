import { inject, Injectable } from "@angular/core";
import { InventoryValuation, InventoryValuationItem } from "../dto/inventory-valuation.model";
import { RetailDatabase } from "../../data-access/database/retail.database";
import { sumCurrencyMinorUnits } from "../../domain/policies/currency-rounding.policy";

@Injectable({ providedIn: "root" })
export class InventoryValuationService {
  private readonly db = inject(RetailDatabase);

  async getValuation(): Promise<InventoryValuation> {
    const [products, batches] = await Promise.all([this.db.products.toArray(), this.db.inventoryBatches.toArray()]);

    const productsWithStock = products.filter(product => product.quantity > 0);

    const batchesByProduct = new Map<string, typeof batches>();
    for (const batch of batches) {
      if (batch.remaining_quantity <= 0) continue;
      const list = batchesByProduct.get(batch.product_id) ?? [];
      list.push(batch);
      batchesByProduct.set(batch.product_id, list);
    }

    const items: InventoryValuationItem[] = products
      .map(product => {
        const productBatches = batchesByProduct.get(product.id) ?? [];
        const latestBatch = productBatches.filter(batch => batch.remaining_quantity > 0).sort((a, b) => b.sequence - a.sequence)[0];

        if (!latestBatch) return null;

        const latestUnitCost = latestBatch.remaining_quantity > 0 ? Math.round(latestBatch.remaining_total_cost / latestBatch.remaining_quantity) : 0;

        return {
          product_id: product.id,
          product_name: product.name,
          quantity: product.quantity,
          latest_unit_cost: latestUnitCost,
          total_value: Math.round(latestUnitCost * product.quantity),
        };
      })
      .filter((item): item is InventoryValuationItem => item !== null)
      .sort((a, b) => b.total_value - a.total_value || a.product_name.localeCompare(b.product_name));

    return {
      items,
      total_units: items.reduce((sum, item) => sum + item.quantity, 0),
      total_value: sumCurrencyMinorUnits(items.map(item => item.total_value)),
    };
  }
}
