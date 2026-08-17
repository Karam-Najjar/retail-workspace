import { Component, computed, inject, input, signal } from "@angular/core";
import { CurrencyService, STORE_PROFILE, StoreProfile } from "@retail/kernel";
import Decimal from "decimal.js";

@Component({ selector: "app-money-display", templateUrl: "./money-display.component.html", styleUrl: "./money-display.component.scss" })
export class MoneyDisplayComponent {
  private readonly profile: StoreProfile = inject(STORE_PROFILE);
  private readonly currency = inject(CurrencyService);
  private readonly exchangeRate = signal<Decimal>(new Decimal(1));

  readonly cents = input.required<number>();

  readonly primaryValue = computed(() => {
    const scale = 10 ** this.profile.currency.primary.precision;
    const major = this.cents() / scale;
    const trimmed = Number(major.toFixed(this.profile.currency.primary.precision).replace(/\.?0+$/, ""));
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: this.profile.currency.primary.code,
      minimumFractionDigits: this.decimals(trimmed),
      maximumFractionDigits: this.profile.currency.primary.precision,
    }).format(trimmed);
  });

  readonly secondaryValue = computed(() => {
    const scale = 10 ** this.profile.currency.primary.precision;
    const syp = this.exchangeRate().mul(this.cents()).div(scale).toDecimalPlaces(0).toString();
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

  private decimals(value: number): number {
    const text = String(value);
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
  }
}
