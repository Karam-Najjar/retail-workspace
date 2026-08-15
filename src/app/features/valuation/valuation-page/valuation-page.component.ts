import { Component, inject, OnInit } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { TranslatePipe } from "@ngx-translate/core";
import { StoreProfileService } from "@retail/kernel";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { ValuationFacade } from "../valuation.facade";

@Component({
  selector: "app-valuation-page",
  imports: [EmptyStateComponent, MatCardModule, TranslatePipe],
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
    const { code, precision } = this.profile.currency.primary;
    return `${(cents / 10 ** precision).toFixed(precision)} ${code}`;
  }

  protected formatSecondary(cents: number): string {
    return `${cents} ${this.profile.currency.secondary.code}`;
  }
}