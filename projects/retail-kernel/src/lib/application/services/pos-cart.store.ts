import { Injectable, signal } from '@angular/core';
import { DexieDraftCartRepository } from '../../data-access/repositories/dexie-draft-cart.repository';
import { DraftCart } from '../../domain/models/draft-cart.model';
import { DraftCartItem } from '../../domain/models/draft-cart-item.model';
import { Product } from '../../domain/models/product.model';
import { CheckoutIdempotencyService } from './checkout-idempotency.service';

export type CartMutationStatus = 'added' | 'capped' | 'out_of_stock';

export interface CartMutationResult {
  readonly status: CartMutationStatus;
  readonly moreAvailable: number;
}

@Injectable({ providedIn: 'root' })
export class PosCartStore {
  private readonly repository: DexieDraftCartRepository;
  private createdAt = new Date();
  private persistenceQueue: Promise<void> = Promise.resolve();
  readonly items = signal<readonly DraftCartItem[]>([]);
  readonly initialized = signal(false);

  constructor(
    repository: DexieDraftCartRepository,
    private readonly checkoutIdempotency: CheckoutIdempotencyService,
  ) { this.repository = repository; }

  async initialize(): Promise<void> {
    if (this.initialized()) return;
    const draft = await this.repository.getActive();
    if (draft) { this.items.set(draft.items); this.createdAt = draft.created_at; }
    this.checkoutIdempotency.restore(
      this.items(),
      draft?.checkout_idempotency_key ?? null,
    );
    this.initialized.set(true);
  }

  total(): number { return this.items().reduce((sum, item) => sum + item.quantity_base_units * item.selling_price_per_unit, 0); }
  hasItems(): boolean { return this.items().length > 0; }

  add(product: Product, candidate: Omit<DraftCartItem, 'package_quantity' | 'quantity_base_units'>): Promise<CartMutationResult> {
    return this.change(product, candidate.product_barcode_id, 1, candidate);
  }

  change(product: Product, barcodeId: string | null, packageDelta: number, candidate?: Omit<DraftCartItem, 'package_quantity' | 'quantity_base_units'>): Promise<CartMutationResult> {
    const currentItems = this.items();
    const index = currentItems.findIndex((item) => item.product_id === product.id && item.product_barcode_id === barcodeId);
    const current = index >= 0 ? currentItems[index] : undefined;
    if (!current && !candidate) throw new Error('Cart line could not be found.');
    const lineTemplate = current ?? candidate!;
    const desiredPackages = (current?.package_quantity ?? 0) + packageDelta;
    if (desiredPackages <= 0) {
      if (index >= 0) return this.replace(currentItems.filter((_, itemIndex) => itemIndex !== index), { status: 'added', moreAvailable: product.quantity - this.productQuantity(product.id, currentItems) });
      return Promise.resolve({ status: 'added', moreAvailable: product.quantity });
    }

    if (packageDelta < 0) {
      const nextLine: DraftCartItem = { ...lineTemplate, package_quantity: desiredPackages, quantity_base_units: desiredPackages * lineTemplate.multiplier };
      return this.replace(currentItems.map((item, itemIndex) => itemIndex === index ? nextLine : item), { status: 'added', moreAvailable: 0 });
    }

    const productQuantity = this.productQuantity(product.id, currentItems);
    const currentQuantity = current?.quantity_base_units ?? 0;
    const otherQuantity = productQuantity - currentQuantity;
    const maximumLineQuantity = Math.max(0, product.quantity - otherQuantity);
    const maximumPackages = Math.floor(maximumLineQuantity / lineTemplate.multiplier);
    const moreAvailable = Math.max(0, product.quantity - productQuantity);
    if (product.quantity <= 0) return Promise.resolve({ status: 'out_of_stock', moreAvailable: 0 });
    if (desiredPackages > maximumPackages) {
      if (maximumPackages <= (current?.package_quantity ?? 0)) return Promise.resolve({ status: 'capped', moreAvailable });
      const cappedLine: DraftCartItem = { ...lineTemplate, package_quantity: maximumPackages, quantity_base_units: maximumPackages * lineTemplate.multiplier };
      const cappedItems = index >= 0 ? currentItems.map((item, itemIndex) => itemIndex === index ? cappedLine : item) : [...currentItems, cappedLine];
      return this.replace(cappedItems, { status: 'capped', moreAvailable });
    }

    const nextLine: DraftCartItem = { ...lineTemplate, package_quantity: desiredPackages, quantity_base_units: desiredPackages * lineTemplate.multiplier };
    const nextItems = index >= 0 ? currentItems.map((item, itemIndex) => itemIndex === index ? nextLine : item) : [...currentItems, nextLine];
    return this.replace(nextItems, { status: 'added', moreAvailable: Math.max(0, product.quantity - this.productQuantity(product.id, nextItems)) });
  }

  async remove(productId: string, barcodeId: string | null): Promise<void> {
    await this.replace(this.items().filter((item) => item.product_id !== productId || item.product_barcode_id !== barcodeId), { status: 'added', moreAvailable: 0 });
  }

  async clear(): Promise<void> { await this.replace([], { status: 'added', moreAvailable: 0 }); }

  async getOrCreateCheckoutIdempotencyKey(): Promise<string> {
    const items = this.items();
    if (!items.length) throw new Error('The cart is empty.');
    const idempotencyKey = this.checkoutIdempotency.getOrCreate(items);
    const draft: DraftCart = {
      id: 'active',
      items,
      checkout_idempotency_key: idempotencyKey,
      created_at: this.createdAt,
      updated_at: new Date(),
    };
    this.persistenceQueue = this.persistenceQueue
      .catch(() => undefined)
      .then(() => this.repository.save(draft));
    await this.persistenceQueue;
    return idempotencyKey;
  }

  markCheckoutCompleted(): void {
    this.items.set([]);
    this.createdAt = new Date();
    this.checkoutIdempotency.reset([]);
  }

  private productQuantity(productId: string, items: readonly DraftCartItem[]): number { return items.filter((item) => item.product_id === productId).reduce((sum, item) => sum + item.quantity_base_units, 0); }
  private async replace(items: readonly DraftCartItem[], result: CartMutationResult): Promise<CartMutationResult> {
    this.items.set(items);
    this.checkoutIdempotency.reset(items);
    const draft: DraftCart = {
      id: 'active',
      items,
      checkout_idempotency_key: null,
      created_at: this.createdAt,
      updated_at: new Date(),
    };
    this.persistenceQueue = this.persistenceQueue.catch(() => undefined).then(() => this.repository.save(draft));
    await this.persistenceQueue;
    return result;
  }
}
