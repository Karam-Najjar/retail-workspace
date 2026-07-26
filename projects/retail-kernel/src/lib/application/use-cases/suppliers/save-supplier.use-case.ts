import { inject, Injectable } from '@angular/core';
import { Supplier } from '../../../domain/models/supplier.model';
import { DexieSupplierRepository } from '../../../data-access/repositories/dexie-supplier.repository';
import { ActiveOperatorService } from '../../services/active-operator.service';

export interface SaveSupplierInput {
  readonly id?: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly notes: string;
}

@Injectable({ providedIn: 'root' })
export class SaveSupplierUseCase {
  private readonly repository = inject(DexieSupplierRepository);
  private readonly activeOperator = inject(ActiveOperatorService);

  async execute(input: SaveSupplierInput): Promise<Supplier> {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const address = input.address.trim();
    const notes = input.notes.trim();
    if (!name || name.length > 100) throw new Error('Supplier name must be between 1 and 100 characters.');
    if (phone.length > 20) throw new Error('Supplier phone must be 20 characters or fewer.');
    if (address.length > 200) throw new Error('Supplier address must be 200 characters or fewer.');
    if (notes.length > 500) throw new Error('Supplier notes must be 500 characters or fewer.');
    const operator = this.activeOperator.activeOperator();
    if (!operator) throw new Error('An active operator is required.');

    const existing = input.id ? await this.repository.getById(input.id) : undefined;
    const now = new Date();
    const supplier: Supplier = {
      id: existing?.id ?? crypto.randomUUID(), name, phone, address, notes,
      created_by_operator_id: existing?.created_by_operator_id ?? operator.id,
      last_modified_by_operator_id: operator.id,
      created_at: existing?.created_at ?? now, updated_at: now,
    };
    await this.repository.save(supplier);
    return supplier;
  }
}
