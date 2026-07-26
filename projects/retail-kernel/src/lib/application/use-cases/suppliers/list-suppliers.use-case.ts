import { inject, Injectable } from '@angular/core';
import { Supplier } from '../../../domain/models/supplier.model';
import { DexieSupplierRepository } from '../../../data-access/repositories/dexie-supplier.repository';

@Injectable({ providedIn: 'root' })
export class ListSuppliersUseCase {
  private readonly repository = inject(DexieSupplierRepository);
  execute(): Promise<readonly Supplier[]> { return this.repository.list(); }
}
