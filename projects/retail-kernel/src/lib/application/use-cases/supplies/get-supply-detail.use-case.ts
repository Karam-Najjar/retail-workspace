import { inject, Injectable } from '@angular/core';
import { DexieSupplyRepository } from '../../../data-access/repositories/dexie-supply.repository';
import { SupplyDetail } from '../../../domain/repository-contracts/supply.repository';

@Injectable({ providedIn: 'root' })
export class GetSupplyDetailUseCase {
  private readonly repository = inject(DexieSupplyRepository);
  execute(id: string): Promise<SupplyDetail | undefined> { return this.repository.getDetail(id); }
}
