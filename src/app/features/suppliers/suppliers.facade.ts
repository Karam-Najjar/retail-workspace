import { inject, Injectable, signal } from '@angular/core';
import { DeleteSupplierUseCase, GetSupplierDetailUseCase, ListSuppliersUseCase, SaveSupplierInput, SaveSupplierUseCase, Supplier } from '@retail/kernel';
import { DexieSupplierRepository } from '@retail/kernel';

@Injectable()
export class SuppliersFacade {
  private readonly listUseCase = inject(ListSuppliersUseCase);
  private readonly getUseCase = inject(GetSupplierDetailUseCase);
  private readonly saveUseCase = inject(SaveSupplierUseCase);
  private readonly deleteUseCase = inject(DeleteSupplierUseCase);
  private readonly repository = inject(DexieSupplierRepository);
  readonly suppliers = signal<readonly Supplier[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.suppliers.set(await this.listUseCase.execute()); }
    catch { this.error.set('suppliers.errors.load'); }
    finally { this.loading.set(false); }
  }
  get(id: string): Promise<Supplier | undefined> { return this.getUseCase.execute(id); }
  async save(input: SaveSupplierInput): Promise<Supplier | null> {
    try { const result = await this.saveUseCase.execute(input); await this.load(); return result; }
    catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'suppliers.errors.save'); return null; }
  }
  async delete(supplier: Supplier): Promise<number | null> {
    try { const result = await this.deleteUseCase.execute(supplier); await this.load(); return result; }
    catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'suppliers.errors.delete'); return null; }
  }
  countAffectedSupplies(id: string): Promise<number> { return this.repository.countAffectedSupplies(id); }
}
