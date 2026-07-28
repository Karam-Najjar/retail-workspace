import { Component, effect, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "@ngx-translate/core";

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

  constructor() {
    effect(() => {
      const primary = this.cents() / 100;
      const secondary = primary * this.rate();
      if (this.lastEdited() === "primary") this.secondaryValue.set(secondary);
      else if (this.lastEdited() === "secondary") this.primaryValue.set(primary);
      else {
        this.primaryValue.set(primary);
        this.secondaryValue.set(secondary);
      }
    });
  }

  protected updatePrimary(value: string | number | null): void {
    const parsed = this.parse(value);
    if (parsed === null) return;
    this.lastEdited.set("primary");
    this.primaryValue.set(parsed);
    this.secondaryValue.set(parsed * this.rate());
    this.centsChange.emit(Math.round(parsed * 100));
  }

  protected updateSecondary(value: string | number | null): void {
    const parsed = this.parse(value);
    const rate = this.rate();
    if (parsed === null || rate <= 0) return;
    const primary = parsed / rate;
    this.lastEdited.set("secondary");
    this.secondaryValue.set(parsed);
    this.primaryValue.set(primary);
    this.centsChange.emit(Math.round(primary * 100));
  }

  private parse(value: string | number | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  private rate(): number {
    const parsed = Number(this.exchangeRate());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
}
