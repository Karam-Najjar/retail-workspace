import { inject, Injectable, signal } from "@angular/core";
import {
  AdjustStockInUseCase,
  AdjustStockOutUseCase,
  Category,
  CreateOpeningBalanceUseCase,
  DeleteEmptyProductUseCase,
  GetProductDetailUseCase,
  GetProductInventoryUseCase,
  ListCategoriesUseCase,
  ListProductsUseCase,
  ManageProductBarcodesUseCase,
  Product,
  ProductBarcode,
  ProductBarcodeInput,
  ProductInventory,
  SaveProductInput,
  SaveProductUseCase,
  WriteOffAndDeleteProductUseCase,
} from "@retail/kernel";
import { NotificationService } from "../../core/notifications/notification.service";

@Injectable()
export class ProductsFacade {
  private readonly listProducts = inject(ListProductsUseCase);
  private readonly getDetail = inject(GetProductDetailUseCase);
  private readonly getProductInventory = inject(GetProductInventoryUseCase);
  private readonly saveProduct = inject(SaveProductUseCase);
  private readonly deleteProduct = inject(DeleteEmptyProductUseCase);
  private readonly manageBarcodes = inject(ManageProductBarcodesUseCase);
  private readonly listCategories = inject(ListCategoriesUseCase);
  private readonly openingBalance = inject(CreateOpeningBalanceUseCase);
  private readonly stockIn = inject(AdjustStockInUseCase);
  private readonly stockOut = inject(AdjustStockOutUseCase);
  private readonly writeOff = inject(WriteOffAndDeleteProductUseCase);
  private readonly notifications = inject(NotificationService);
  readonly products = signal<readonly Product[]>([]);
  readonly categories = signal<readonly Category[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  async load(search = "", categoryId?: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [products, categories] = await Promise.all([this.listProducts.execute(search, categoryId), this.listCategories.execute()]);
      this.products.set(products);
      this.categories.set(categories);
    } catch {
      this.error.set("products.errors.load");
      this.notifications.error("products.errors.load");
    } finally {
      this.loading.set(false);
    }
  }
  get(id: string) {
    return this.getDetail.execute(id);
  }
  async getInventory(id: string): Promise<ProductInventory | undefined> {
    try {
      return await this.getProductInventory.execute(id);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "inventory.errors.load");
      this.notifications.error("inventory.errors.load");
      return undefined;
    }
  }
  async save(input: SaveProductInput): Promise<Product | null> {
    try {
      const product = await this.saveProduct.execute(input);
      return product;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "products.errors.save");
      return null;
    }
  }
  async delete(product: Product): Promise<boolean> {
    try {
      const inventory = await this.getProductInventory.execute(product.id);
      if (!inventory) throw new Error("Product could not be found.");
      if (inventory.product.quantity !== 0) throw new Error("Only products with zero stock can be deleted.");
      await this.deleteProduct.execute(inventory.product);
      this.notifications.success("notifications.success.productDeleted");
      return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "products.errors.delete");
      this.notifications.error("products.errors.delete");
      return false;
    }
  }
  async saveBarcodes(productId: string, barcodes: readonly ProductBarcodeInput[]): Promise<readonly ProductBarcode[] | null> {
    try {
      const saved = await this.manageBarcodes.execute(productId, barcodes);
      this.notifications.success("notifications.success.barcodesSaved");
      return saved;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "products.errors.barcodes");
      return null;
    }
  }
  async createOpeningBalance(productId: string, quantity: number, unitCostCents: number, reason: string): Promise<boolean> {
    try {
      await this.openingBalance.execute({ productId, quantity, unitCostCents, reason });
      this.notifications.success("notifications.success.openingBalanceCreated");
      return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "inventory.errors.save");
      return false;
    }
  }
  async addStock(productId: string, quantity: number, unitCostCents: number, reason: string): Promise<boolean> {
    try {
      await this.stockIn.execute({ productId, quantity, unitCostCents, reason });
      this.notifications.success("notifications.success.stockAdded");
      return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "inventory.errors.save");
      return false;
    }
  }
  async removeStock(productId: string, quantity: number, reason: string): Promise<boolean> {
    try {
      await this.stockOut.execute({ productId, quantity, reason });
      this.notifications.success("notifications.success.stockRemoved");
      return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "inventory.errors.save");
      return false;
    }
  }
  async writeOffAndDelete(productId: string, reason: string): Promise<boolean> {
    try {
      await this.writeOff.execute({ productId, reason });
      this.notifications.success("notifications.success.productWrittenOff");
      return true;
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : "inventory.errors.writeOff");
      return false;
    }
  }
}
