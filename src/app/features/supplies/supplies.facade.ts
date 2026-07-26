import { inject, Injectable, signal } from '@angular/core';
import { CurrencyService, DexieInventoryBatchRepository, GetSupplyDetailUseCase, ListProductsUseCase, ListSuppliersUseCase, ListSuppliesUseCase, Product, ReceiveSupplyInput, ReceiveSupplyUseCase, StorePackageType, StoreProfileService, Supplier, Supply, SupplyDetail, SupplyListEntry, SupplyListFilter } from '@retail/kernel';

@Injectable()
export class SuppliesFacade {
  private readonly listSupplies = inject(ListSuppliesUseCase);
  private readonly getSupply = inject(GetSupplyDetailUseCase);
  private readonly receiveSupply = inject(ReceiveSupplyUseCase);
  private readonly listProducts = inject(ListProductsUseCase);
  private readonly listSuppliers = inject(ListSuppliersUseCase);
  private readonly currency = inject(CurrencyService);
  private readonly batches = inject(DexieInventoryBatchRepository);
  private readonly profile = inject(StoreProfileService);
  readonly supplies = signal<readonly SupplyListEntry[]>([]);
  readonly products = signal<readonly Product[]>([]);
  readonly suppliers = signal<readonly Supplier[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly packageTypes: readonly StorePackageType[] = this.profile.profile.package_types;

  async load(filter: SupplyListFilter = {}): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const [supplies, suppliers] = await Promise.all([this.listSupplies.execute(filter), this.listSuppliers.execute()]);
      this.supplies.set(supplies); this.suppliers.set(suppliers);
    } catch { this.error.set('supplies.errors.load'); }
    finally { this.loading.set(false); }
  }

  async loadFormData(): Promise<string> {
    const [products, suppliers, exchangeRate] = await Promise.all([this.listProducts.execute(), this.listSuppliers.execute(), this.currency.currentExchangeRate()]);
    this.products.set(products); this.suppliers.set(suppliers); return exchangeRate;
  }

  async receive(input: ReceiveSupplyInput): Promise<Supply | null> {
    this.error.set(null);
    try { return await this.receiveSupply.execute(input); }
    catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'supplies.errors.receive'); return null; }
  }

  get(id: string): Promise<SupplyDetail | undefined> { return this.getSupply.execute(id); }
  recentForSupplier(id: string, limit = 10): Promise<readonly Supply[]> { return this.listSupplies.listRecentBySupplier(id, limit); }
  async latestBaseUnitCost(productId: string): Promise<string | null> { return (await this.batches.listByProduct(productId)).at(-1)?.unit_cost_display ?? null; }
  addSupplier(supplier: Supplier): void { this.suppliers.update((current) => [...current.filter((item) => item.id !== supplier.id), supplier].sort((left, right) => left.name.localeCompare(right.name))); }
}
