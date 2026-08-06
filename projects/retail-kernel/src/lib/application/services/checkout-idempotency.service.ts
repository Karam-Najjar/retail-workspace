import { Injectable } from "@angular/core";
import { DraftCartItem } from "../../domain/models/draft-cart-item.model";

@Injectable({ providedIn: "root" })
export class CheckoutIdempotencyService {
  private cartFingerprint: string | null = null;
  private idempotencyKey: string | null = null;

  restore(items: readonly DraftCartItem[], idempotencyKey: string | null): void {
    this.cartFingerprint = this.fingerprint(items);
    this.idempotencyKey = idempotencyKey?.trim() ? idempotencyKey : null;
  }

  reset(items: readonly DraftCartItem[]): void {
    this.cartFingerprint = this.fingerprint(items);
    this.idempotencyKey = null;
  }

  getOrCreate(items: readonly DraftCartItem[]): string {
    const fingerprint = this.fingerprint(items);
    if (fingerprint !== this.cartFingerprint) this.reset(items);
    this.idempotencyKey ??= crypto.randomUUID();
    return this.idempotencyKey;
  }

  private fingerprint(items: readonly DraftCartItem[]): string {
    return JSON.stringify(
      items.map(item => [
        item.product_id,
        item.product_name,
        item.product_barcode_id,
        item.barcode,
        item.package_type_code,
        item.multiplier,
        item.package_quantity,
        item.quantity_base_units,
        item.default_selling_price_per_unit,
        item.selling_price_per_unit,
        item.entry_method,
      ])
    );
  }
}
