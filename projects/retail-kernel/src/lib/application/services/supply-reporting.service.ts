import { inject, Injectable } from '@angular/core';
import { SupplySummary } from '../dto/supply-summary.model';
import { SupplyDetail, SupplyListFilter } from '../../domain/repository-contracts/supply.repository';
import { DexieSupplyRepository } from '../../data-access/repositories/dexie-supply.repository';

export interface SupplyReport {
  readonly details: readonly SupplyDetail[];
  readonly summary: SupplySummary;
}

@Injectable({ providedIn: 'root' })
export class SupplyReportingService {
  private readonly repository = inject(DexieSupplyRepository);

  async getReport(filter: SupplyListFilter = {}): Promise<SupplyReport> {
    const supplies = await this.repository.list(filter);
    const details = (await Promise.all(supplies.map((supply) => this.repository.getDetail(supply.id)))).filter((detail): detail is SupplyDetail => detail !== undefined);
    return {
      details,
      summary: {
        total_cost: details.reduce((total, detail) => total + detail.supply.total_cost, 0),
        transaction_count: details.length,
        total_base_units: details.reduce((total, detail) => total + detail.items.reduce((lineTotal, item) => lineTotal + item.quantity_base_units, 0), 0),
      },
    };
  }
}
