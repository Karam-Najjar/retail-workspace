import { Component, effect, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "@ngx-translate/core";
import { STORE_PROFILE, StoreProfile } from "@retail/kernel";

@Component({
  selector: "app-dual-currency-input",
  imports: [FormsModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  templateUrl: "./dual-currency-input.component.html",
  styleUrl: "./dual-currency-input.component.scss",
})
export class DualCurrencyInputComponent {
  readonly cents = input.required<number>();
  readonly exchangeRate = input.required<string>();
  readonly labelKey = input("products.sellingPrice");
  readonly centsChange = output<number>();
  protected readonly primaryValue = signal(0);
  protected readonly secondaryValue = signal(0);
  private readonly lastEdited = signal<"primary" | "secondary" | null>(null);
  private readonly profile: StoreProfile = inject(STORE_PROFILE);

  constructor() {
    effect(() => {
      const primary = this.cents() / this.scale();
      const secondary = primary * this.rate();
      if (this.lastEdited() === "primary") this.secondaryValue.set(this.formatDisplay(secondary));
      else if (this.lastEdited() === "secondary") this.primaryValue.set(this.formatDisplay(primary));
      else {
        this.primaryValue.set(this.formatDisplay(primary));
        this.secondaryValue.set(this.formatDisplay(secondary));
      }
    });
  }

  protected updatePrimary(value: string | number | null): void {
    const parsed = this.parse(value);
    if (parsed === null) return;
    this.lastEdited.set("primary");
    this.primaryValue.set(this.formatDisplay(parsed));
    this.secondaryValue.set(this.formatDisplay(parsed * this.rate()));
    this.centsChange.emit(Math.round(parsed * this.scale()));
  }

  protected updateSecondary(value: string | number | null): void {
    const parsed = this.parse(value);
    const rate = this.rate();
    if (parsed === null || rate <= 0) return;
    const primary = parsed / rate;
    this.lastEdited.set("secondary");
    this.secondaryValue.set(this.formatDisplay(parsed));
    this.primaryValue.set(this.formatDisplay(primary));
    this.centsChange.emit(Math.round(primary * this.scale()));
  }

  private parse(value: string | number | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private rate(): number {
    const parsed = Number(this.exchangeRate());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private scale(): number {
    return 10 ** this.profile.currency.primary.precision;
  }

  private formatDisplay(value: number): number {
    return Number(value.toFixed(4).replace(/\.?0+$/, ""));
  }
}