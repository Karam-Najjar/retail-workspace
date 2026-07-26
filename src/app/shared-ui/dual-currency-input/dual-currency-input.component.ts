import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

@Component({ selector: 'app-dual-currency-input', imports: [FormsModule, MatFormFieldModule, MatInputModule, TranslatePipe], templateUrl: './dual-currency-input.component.html', styleUrl: './dual-currency-input.component.scss' })
export class DualCurrencyInputComponent {
  readonly cents = input.required<number>();
  readonly exchangeRate = input.required<string>();
  readonly centsChange = output<number>();
  readonly secondaryValue = computed(() => this.cents() / 100 * this.rate());
  protected updatePrimary(value: string): void { const parsed = Number(value); if (Number.isFinite(parsed) && parsed >= 0) this.centsChange.emit(Math.round(parsed * 100)); }
  protected updateSecondary(value: string): void { const parsed = Number(value); const rate = this.rate(); if (Number.isFinite(parsed) && parsed >= 0 && rate > 0) this.centsChange.emit(Math.round(parsed / rate * 100)); }
  private rate(): number { const parsed = Number(this.exchangeRate()); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
}
