import { Component, inject, input, output, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { TranslatePipe } from "@ngx-translate/core";
import {
  DraftCartItem,
  formatCurrencyMinorUnits,
  formatDualCurrencyMinorUnits,
  multiplyCurrencyMinorUnits,
  STORE_PROFILE,
  StoreProfile,
} from "@retail/kernel";
import { DualCurrencyInputComponent } from "../../../shared-ui/dual-currency-input/dual-currency-input.component";

@Component({
  selector: "app-cart-item",
  imports: [DualCurrencyInputComponent, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: "./cart-item.component.html",
  styleUrl: "./cart-item.component.scss",
})
export class CartItemComponent {
  readonly item = input.required<DraftCartItem>();
  readonly exchangeRate = input.required<string>();
  readonly increase = output<void>();
  readonly decrease = output<void>();
  readonly remove = output<void>();
  readonly priceChange = output<number | null>();
  protected readonly editingPrice = signal(false);
  protected readonly editedPriceCents = signal(0);
  protected readonly priceInvalid = signal(false);
  private readonly profile: StoreProfile = inject(STORE_PROFILE);

  protected subtotal(): number {
    const item = this.item();
    return multiplyCurrencyMinorUnits(item.selling_price_per_unit, item.quantity_base_units);
  }

  protected formatPrice(value: number): string {
    return formatCurrencyMinorUnits(value, 4);
  }

  protected isPriceOverridden(): boolean {
    const item = this.item();
    return item.selling_price_per_unit !== item.default_selling_price_per_unit;
  }

  protected beginPriceEdit(): void {
    this.editedPriceCents.set(this.item().selling_price_per_unit);
    this.priceInvalid.set(false);
    this.editingPrice.set(true);
  }

  protected updateEditedPrice(value: number): void {
    this.editedPriceCents.set(value);
    this.priceInvalid.set(!this.isValidPrice(value));
  }

  protected savePrice(event: Event): void {
    event.preventDefault();
    const price = this.editedPriceCents();
    if (!this.isValidPrice(price)) {
      this.priceInvalid.set(true);
      return;
    }
    this.editingPrice.set(false);
    if (price !== this.item().selling_price_per_unit) this.priceChange.emit(price);
  }

  protected cancelPriceEdit(): void {
    this.priceInvalid.set(false);
    this.editingPrice.set(false);
  }

  protected useDefaultPrice(): void {
    this.priceInvalid.set(false);
    this.editingPrice.set(false);
    if (this.isPriceOverridden()) this.priceChange.emit(null);
  }

  private isValidPrice(value: number): boolean {
    return Number.isSafeInteger(value) && value > 0;
  }

  protected formatDualPrice(cents: number): string {
    return formatDualCurrencyMinorUnits(
      cents,
      this.profile.currency.primary.precision,
      this.profile.currency.primary.code,
      this.exchangeRate(),
      this.profile.currency.secondary.code,
      this.profile.currency.secondary.precision
    );
  }
}
