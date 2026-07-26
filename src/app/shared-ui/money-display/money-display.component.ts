import { Component, computed, inject, input } from '@angular/core';
import { STORE_PROFILE, StoreProfile } from '@retail/kernel';

@Component({ selector: 'app-money-display', templateUrl: './money-display.component.html', styleUrl: './money-display.component.scss' })
export class MoneyDisplayComponent {
  private readonly profile: StoreProfile = inject(STORE_PROFILE);
  readonly cents = input.required<number>();
  readonly value = computed(() => new Intl.NumberFormat(undefined, { style: 'currency', currency: this.profile.currency.primary.code, minimumFractionDigits: this.profile.currency.primary.precision }).format(this.cents() / 100));
}
