import { inject, Injectable, signal } from "@angular/core";
import {
  AddCartItemResult,
  AddCartItemUseCase,
  ChangeCartQuantityUseCase,
  CheckoutUseCase,
  ClearCartUseCase,
  CurrencyService,
  DraftCartItem,
  ListProductsUseCase,
  PosCartStore,
  Product,
  Sale,
} from "@retail/kernel";

export interface PosFeedback {
  readonly key: string;
  readonly kind: "error" | "success";
  readonly params?: Readonly<Record<string, number>>;
}

@Injectable()
export class PosFacade {
  private readonly addItem = inject(AddCartItemUseCase);
  private readonly changeQuantity = inject(ChangeCartQuantityUseCase);
  private readonly clearCart = inject(ClearCartUseCase);
  private readonly completeSale = inject(CheckoutUseCase);
  private readonly listProducts = inject(ListProductsUseCase);
  private readonly currency = inject(CurrencyService);
  readonly cart = inject(PosCartStore);
  private operationQueue: Promise<void> = Promise.resolve();
  readonly products = signal<readonly Product[]>([]);
  readonly exchangeRate = signal("0");
  readonly loading = signal(false);
  readonly checkingOut = signal(false);
  readonly feedback = signal<PosFeedback | null>(null);

  async initialize(): Promise<void> {
    this.loading.set(true);
    try {
      const [products, exchangeRate] = await Promise.all([this.listProducts.execute(), this.currency.currentExchangeRate(), this.cart.initialize()]);
      this.products.set(products);
      this.exchangeRate.set(exchangeRate);
    } finally {
      this.loading.set(false);
    }
  }

  scan(barcode: string): Promise<AddCartItemResult> {
    return this.enqueue(() => this.addItem.execute({ entryMethod: "scan", barcode }));
  }
  addProduct(productId: string): Promise<AddCartItemResult> {
    return this.enqueue(() => this.addItem.execute({ entryMethod: "search", productId }));
  }
  change(item: DraftCartItem, packageDelta: number): Promise<void> {
    return this.enqueue(async () => {
      const result = await this.changeQuantity.execute({ productId: item.product_id, productBarcodeId: item.product_barcode_id, packageDelta });
      this.setFeedback(result);
    });
  }
  remove(item: DraftCartItem): Promise<void> {
    return this.change(item, -item.package_quantity);
  }
  clear(): Promise<void> {
    return this.enqueue(async () => {
      await this.clearCart.execute();
      this.feedback.set(null);
    });
  }
  total(): number {
    return this.cart.total();
  }

  async checkout(): Promise<Sale | null> {
    if (this.checkingOut() || !this.cart.hasItems()) return null;
    this.checkingOut.set(true);
    this.feedback.set(null);
    try {
      const sale = await this.enqueue(() => this.completeSale.execute());
      this.feedback.set({ key: "pos.saleCompleted", kind: "success" });
      try {
        await this.refreshProducts();
      } catch {
        // The sale is already committed; product search will refresh on the next POS load.
      }
      return sale;
    } catch {
      this.feedback.set({ key: "pos.checkoutFailed", kind: "error" });
      return null;
    } finally {
      this.checkingOut.set(false);
    }
  }

  async refreshProducts(): Promise<void> {
    this.products.set(await this.listProducts.execute());
  }

  setError(): void {
    this.feedback.set({ key: "pos.cartUpdateFailed", kind: "error" });
  }

  setFeedback(result: AddCartItemResult): void {
    if (result.status === "capped") this.feedback.set({ key: "pos.onlyMoreAvailable", kind: "error", params: { count: result.moreAvailable } });
    else if (result.status === "out_of_stock") this.feedback.set({ key: "pos.outOfStock", kind: "error" });
    else this.feedback.set(null);
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operationQueue.then(operation, operation);
    this.operationQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}
