import { DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { SupplyCurrencySnapshot, SupplyDetail } from "@retail/kernel";
import { DetailPageHeaderComponent } from "../../../shared-ui/detail-page-header/detail-page-header.component";
import { SuppliesFacade } from "../supplies.facade";
import { formatDualCurrencyMinorUnits, STORE_PROFILE, StoreProfile } from "@retail/kernel";

@Component({
  selector: "app-supply-detail",
  imports: [DatePipe, DetailPageHeaderComponent, MatCardModule, TranslatePipe],
  providers: [SuppliesFacade],
  templateUrl: "./supply-detail.component.html",
  styleUrl: "./supply-detail.component.scss",
})
export class SupplyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(SuppliesFacade);
  private readonly storeProfile: StoreProfile = inject(STORE_PROFILE);
  protected readonly detail = signal<SupplyDetail | null>(null);
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("supplyId");
    if (id) this.detail.set((await this.facade.get(id)) ?? null);
  }
  protected goBack(): void {
    void this.router.navigate(["/supplies"]);
  }
  protected primaryTotal(detail: SupplyDetail): string {
    const snapshot = detail.supply.currency_snapshot;
    return formatDualCurrencyMinorUnits(
      detail.supply.total_cost,
      snapshot.primary_precision,
      snapshot.primary_code,
      snapshot.exchange_rate,
      this.storeProfile.currency.secondary.code,
      this.storeProfile.currency.secondary.precision
    );
  }
  protected secondaryTotal(detail: SupplyDetail): string {
    const snapshot = detail.supply.currency_snapshot;
    return `${(snapshot.secondary_total_cost / 10 ** snapshot.secondary_precision).toFixed(snapshot.secondary_precision)} ${snapshot.secondary_code}`;
  }

  protected formatDual(amount: number, snapshot: SupplyCurrencySnapshot): string {
  return formatDualCurrencyMinorUnits(
    amount,
    snapshot.primary_precision,
    snapshot.primary_code,
    snapshot.exchange_rate,
    this.storeProfile.currency.secondary.code,
    this.storeProfile.currency.secondary.precision,
  );
}
}
