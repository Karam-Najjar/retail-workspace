import { inject, Injectable } from "@angular/core";
import { SupplySummary } from "../dto/supply-summary.model";
import { SupplyListEntry } from "../use-cases/supplies/list-supplies.use-case";
import { sumCurrencyMinorUnits, sumSafeIntegers } from "../../domain/policies/currency-rounding.policy";
import { SupplyDetail, SupplyListFilter } from "../../domain/repository-contracts/supply.repository";
import { DexieSupplyRepository } from "../../data-access/repositories/dexie-supply.repository";

export interface SupplyReport {
  readonly entries: readonly SupplyListEntry[];
  readonly details: readonly SupplyDetail[];
  readonly summary: SupplySummary;
}

@Injectable({ providedIn: "root" })
export class SupplyReportingService {
  private readonly repository = inject(DexieSupplyRepository);

  async getReport(filter: SupplyListFilter = {}): Promise<SupplyReport> {
    const details = await this.repository.listDetails(filter);
    return {
      entries: details.map(detail => ({ supply: detail.supply, itemCount: detail.items.length })),
      details,
      summary: {
        total_cost: sumCurrencyMinorUnits(details.map(detail => detail.supply.total_cost)),
        transaction_count: details.length,
        total_base_units: sumSafeIntegers(
          details.flatMap(detail => detail.items.map(item => item.quantity_base_units)),
          "Supply quantity total is too large."
        ),
      },
    };
  }
}
