import { Component, inject, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { TranslatePipe } from "@ngx-translate/core";
import { formatCurrencyMinorUnits, StoreProfileService } from "@retail/kernel";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { ValuationFacade } from "../valuation.facade";
import { SummaryCardComponent } from "@app/shared-ui/summary-card/summary-card.component";

@Component({
  selector: "app-valuation-page",
  imports: [EmptyStateComponent, MatCardModule, TranslatePipe, SummaryCardComponent],
  providers: [ValuationFacade],
  templateUrl: "./valuation-page.component.html",
  styleUrl: "./valuation-page.component.scss",
})
export class ValuationPageComponent implements OnInit {
  protected readonly facade = inject(ValuationFacade);
  private readonly profile = inject(StoreProfileService).profile;

  ngOnInit(): void {
    void this.facade.load();
  }

  protected formatPrimary(cents: number): string {
    const scale = 10 ** this.profile.currency.primary.precision;
    const major = cents / scale;
    const trimmed = Number(major.toFixed(this.profile.currency.primary.precision).replace(/\.?0+$/, ""));
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: this.decimals(trimmed),
      maximumFractionDigits: this.profile.currency.primary.precision,
    }).format(trimmed);
  }

  protected formatSecondary(cents: number): string {
    const major = cents / 10 ** this.profile.currency.secondary.precision;
    return `${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(major)} SYP`;
  }

  private decimals(value: number): number {
    const text = String(value);
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
  }
}
