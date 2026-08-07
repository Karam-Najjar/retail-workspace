import { Component, computed, inject, input, signal } from "@angular/core";
import { CurrencyService, STORE_PROFILE, StoreProfile } from "@retail/kernel";
import Decimal from "decimal.js";

@Component({ selector: "app-money-display", templateUrl: "./money-display.component.html", styleUrl: "./money-display.component.scss" })
export class MoneyDisplayComponent {
  private readonly profile: StoreProfile = inject(STORE_PROFILE);
  private readonly currency = inject(CurrencyService);
  private readonly exchangeRate = signal<Decimal>(new Decimal(1));

  readonly cents = input.required<number>();

  readonly primaryValue = computed(() =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: this.profile.currency.primary.code,
      minimumFractionDigits: this.profile.currency.primary.precision,
    }).format(this.cents() / 100)
  );

  readonly secondaryValue = computed(() => {
    const syp = this.exchangeRate().mul(this.cents()).div(100).toDecimalPlaces(0).toString();
    return `${syp} ${this.profile.currency.secondary.code}`;
  });

  constructor() {
    this.fetchRate();
  }

  private async fetchRate(): Promise<void> {
    try {
      const rate = await this.currency.currentExchangeRate();
      this.exchangeRate.set(new Decimal(rate));
    } catch {
      this.exchangeRate.set(new Decimal(1));
    }
  }
}