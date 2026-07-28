import { inject, Injectable } from "@angular/core";
import { DexieSupplyRepository } from "../../../data-access/repositories/dexie-supply.repository";
import { Supply } from "../../../domain/models/supply.model";
import { SupplyListFilter } from "../../../domain/repository-contracts/supply.repository";

export interface SupplyListEntry {
  readonly supply: Supply;
  readonly itemCount: number;
}

@Injectable({ providedIn: "root" })
export class ListSuppliesUseCase {
  private readonly repository = inject(DexieSupplyRepository);

  async execute(filter: SupplyListFilter = {}): Promise<readonly SupplyListEntry[]> {
    const supplies = await this.repository.list(filter);
    return Promise.all(
      supplies.map(async supply => ({
        supply,
        itemCount: (await this.repository.getDetail(supply.id))?.items.length ?? 0,
      }))
    );
  }

  listRecentBySupplier(supplierId: string, limit = 10): Promise<readonly Supply[]> {
    return this.repository.listRecentBySupplier(supplierId, limit);
  }
}
