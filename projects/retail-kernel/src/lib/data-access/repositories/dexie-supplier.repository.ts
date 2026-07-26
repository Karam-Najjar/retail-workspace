import { inject, Injectable } from '@angular/core';
import { ActivityLog } from '../../domain/models/activity-log.model';
import { Supplier } from '../../domain/models/supplier.model';
import { SupplierRepository } from '../../domain/repository-contracts/supplier.repository';
import { RetailDatabase } from '../database/retail.database';

@Injectable({ providedIn: 'root' })
export class DexieSupplierRepository implements SupplierRepository {
  private readonly database = inject(RetailDatabase);

  list(): Promise<readonly Supplier[]> { return this.database.suppliers.orderBy('name').toArray(); }
  getById(id: string): Promise<Supplier | undefined> { return this.database.suppliers.get(id); }
  async save(supplier: Supplier): Promise<void> { await this.database.suppliers.put(supplier); }
  async deleteWithActivity(supplier: Supplier, activityLog: unknown): Promise<void> {
    await this.database.transaction('rw', this.database.suppliers, this.database.activity_logs, async () => {
      await this.database.suppliers.delete(supplier.id);
      await this.database.activity_logs.add(activityLog as ActivityLog);
    });
  }
  countAffectedSupplies(_supplierId: string): Promise<number> { return Promise.resolve(0); }
}
