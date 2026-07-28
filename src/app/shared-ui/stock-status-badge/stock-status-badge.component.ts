import { Component, computed, input } from "@angular/core";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
  selector: "app-stock-status-badge",
  imports: [TranslatePipe],
  templateUrl: "./stock-status-badge.component.html",
  styleUrl: "./stock-status-badge.component.scss",
})
export class StockStatusBadgeComponent {
  readonly quantity = input.required<number>();
  readonly threshold = input(0);
  protected readonly status = computed(() => (this.quantity() <= 0 ? "out" : this.quantity() <= this.threshold() ? "low" : "in"));
}
