import { Component, computed, inject, input } from "@angular/core";
import { convertCurrencyMinorUnits, formatCurrencyMinorUnits, StoreProfileService } from "@retail/kernel";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
  selector: "app-cart-totals",
  imports: [TranslatePipe],
  templateUrl: "./cart-totals.component.html",
  styleUrl: "./cart-totals.component.scss",
})
export class CartTotalsComponent {
  private readonly profile = inject(StoreProfileService).profile;
  readonly total = input.required<number>();
  readonly exchangeRate = input.required<string>();
  protected readonly primary = computed(
    () =>
      `${formatCurrencyMinorUnits(this.total(), this.profile.currency.primary.precision)} ${this.profile.currency.primary.code}`
  );
  protected readonly secondary = computed(() => {
    const secondaryMinorUnits = convertCurrencyMinorUnits(
      this.total(),
      this.exchangeRate(),
      this.profile.currency.primary.precision,
      this.profile.currency.secondary.precision
    );
    return `${formatCurrencyMinorUnits(secondaryMinorUnits, this.profile.currency.secondary.precision)} ${this.profile.currency.secondary.code}`;
  });
}
