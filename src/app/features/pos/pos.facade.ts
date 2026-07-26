import { inject, Injectable, signal } from '@angular/core';
import { AddCartItemResult, AddCartItemUseCase, ChangeCartQuantityUseCase, ClearCartUseCase, CurrencyService, DraftCartItem, ListProductsUseCase, PosCartStore, Product } from '@retail/kernel';

export interface PosFeedback { readonly key: string; readonly params?: Readonly<Record<string, number>>; }

@Injectable()
export class PosFacade {
  private readonly addItem = inject(AddCartItemUseCase);
  private readonly changeQuantity = inject(ChangeCartQuantityUseCase);
  private readonly clearCart = inject(ClearCartUseCase);
  private readonly listProducts = inject(ListProductsUseCase);
  private readonly currency = inject(CurrencyService);
  readonly cart = inject(PosCartStore);
  private operationQueue: Promise<void> = Promise.resolve();
  readonly products = signal<readonly Product[]>([]);
  readonly exchangeRate = signal('0');
  readonly loading = signal(false);
  readonly feedback = signal<PosFeedback | null>(null);

  async initialize(): Promise<void> {
    this.loading.set(true);
    try {
      const [products, exchangeRate] = await Promise.all([this.listProducts.execute(), this.currency.currentExchangeRate(), this.cart.initialize()]);
      this.products.set(products); this.exchangeRate.set(exchangeRate);
    } finally { this.loading.set(false); }
  }

  scan(barcode: string): Promise<AddCartItemResult> { return this.enqueue(() => this.addItem.execute({ entryMethod: 'scan', barcode })); }
  addProduct(productId: string): Promise<AddCartItemResult> { return this.enqueue(() => this.addItem.execute({ entryMethod: 'search', productId })); }
  change(item: DraftCartItem, packageDelta: number): Promise<void> { return this.enqueue(async () => { const result = await this.changeQuantity.execute({ productId: item.product_id, productBarcodeId: item.product_barcode_id, packageDelta }); this.setFeedback(result); }); }
  remove(item: DraftCartItem): Promise<void> { return this.change(item, -item.package_quantity); }
  clear(): Promise<void> { return this.enqueue(async () => { await this.clearCart.execute(); this.feedback.set(null); }); }
  total(): number { return this.cart.total(); }

  setFeedback(result: AddCartItemResult): void {
    if (result.status === 'capped') this.feedback.set({ key: 'pos.onlyMoreAvailable', params: { count: result.moreAvailable } });
    else if (result.status === 'out_of_stock') this.feedback.set({ key: 'pos.outOfStock' });
    else this.feedback.set(null);
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operationQueue.then(operation, operation);
    this.operationQueue = next.then(() => undefined, () => undefined);
    return next;
  }
}
