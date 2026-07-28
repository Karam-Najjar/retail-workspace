import { Component, computed, inject, input } from "@angular/core";
import { StoreProfileService } from "@retail/kernel";
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
      `${(this.total() / 10 ** this.profile.currency.primary.precision).toFixed(this.profile.currency.primary.precision)} ${this.profile.currency.primary.code}`
  );
  protected readonly secondary = computed(
    () =>
      `${((this.total() / 10 ** this.profile.currency.primary.precision) * Number(this.exchangeRate())).toFixed(this.profile.currency.secondary.precision)} ${this.profile.currency.secondary.code}`
  );
}
