import { Supplier } from '../models/supplier.model';

export interface SupplierRepository {
  list(): Promise<readonly Supplier[]>;
  getById(id: string): Promise<Supplier | undefined>;
  save(supplier: Supplier): Promise<void>;
  deleteWithActivity(supplier: Supplier, activityLog: unknown): Promise<void>;
  countAffectedSupplies(_supplierId: string): Promise<number>;
}
