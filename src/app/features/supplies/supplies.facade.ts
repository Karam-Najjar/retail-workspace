import { inject, Injectable, signal } from "@angular/core";
import {
  CurrencyService,
  DexieInventoryBatchRepository,
  ExcelExportService,
  GetSupplyDetailUseCase,
  ListProductsUseCase,
  ListSuppliersUseCase,
  ListSuppliesUseCase,
  Product,
  ReceiveSupplyInput,
  ReceiveSupplyUseCase,
  StorePackageType,
  StoreProfileService,
  Supplier,
  Supply,
  SupplyDetail,
  SupplyListEntry,
  SupplyListFilter,
  SupplyReportingService,
  SuppliesWorkbookMapper,
  SupplySummary,
} from "@retail/kernel";
import { NotificationService } from "../../core/notifications/notification.service";

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
  private readonly reporting = inject(SupplyReportingService);
  private readonly excel = inject(ExcelExportService);
  private readonly notifications = inject(NotificationService);
  readonly supplies = signal<readonly SupplyListEntry[]>([]);
  readonly products = signal<readonly Product[]>([]);
  readonly suppliers = signal<readonly Supplier[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<SupplySummary>({ total_cost: 0, transaction_count: 0, total_base_units: 0 });
  readonly exporting = signal(false);
  readonly packageTypes: readonly StorePackageType[] = this.profile.profile.package_types;

  async load(filter: SupplyListFilter = {}): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [suppliers, report] = await Promise.all([
        this.listSuppliers.execute(),
        this.reporting.getReport(filter),
      ]);
      this.supplies.set(report.entries);
      this.suppliers.set(suppliers);
      this.summary.set(report.summary);
    } catch {
      this.error.set("supplies.errors.load");
      this.notifications.error("supplies.errors.load");
    } finally {
      this.loading.set(false);
    }
  }

  async loadFormData(): Promise<string> {
    const [products, suppliers, exchangeRate] = await Promise.all([
      this.listProducts.execute(),
      this.listSuppliers.execute(),
      this.currency.currentExchangeRate(),
    ]);
    this.products.set(products);
    this.suppliers.set(suppliers);
    return exchangeRate;
  }

  async receive(input: ReceiveSupplyInput): Promise<Supply | null> {
    this.error.set(null);
    try {
      const supply = await this.receiveSupply.execute(input);
      this.notifications.success("notifications.success.supplyReceived");
      return supply;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "supplies.errors.receive");
      return null;
    }
  }

  get(id: string): Promise<SupplyDetail | undefined> {
    return this.getSupply.execute(id);
  }
  recentForSupplier(id: string, limit = 10): Promise<readonly Supply[]> {
    return this.listSupplies.listRecentBySupplier(id, limit);
  }
  async latestBaseUnitCost(productId: string): Promise<string | null> {
    return (await this.batches.listByProduct(productId)).at(-1)?.unit_cost_display ?? null;
  }
  addSupplier(supplier: Supplier): void {
    this.suppliers.update(current =>
      [...current.filter(item => item.id !== supplier.id), supplier].sort((left, right) => left.name.localeCompare(right.name))
    );
  }

  async export(filter: SupplyListFilter, fileName: string, rtl: boolean): Promise<void> {
    this.exporting.set(true);
    try {
      const report = await this.reporting.getReport(filter);
      await this.excel.export({ fileName, rtl, sheets: [SuppliesWorkbookMapper.map(report.details)] });
      this.notifications.success("notifications.success.exportCompleted");
    } catch {
      this.notifications.error("notifications.errors.export");
    } finally {
      this.exporting.set(false);
    }
  }
}
