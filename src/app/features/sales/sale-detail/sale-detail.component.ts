import { DatePipe } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { formatCurrencyMinorUnits, SaleCurrencySnapshot, SaleDetail, SaleItem } from "@retail/kernel";
import { DetailPageHeaderComponent } from "../../../shared-ui/detail-page-header/detail-page-header.component";
import { EmptyStateComponent } from "../../../shared-ui/empty-state/empty-state.component";
import { SalesFacade } from "../sales.facade";
import { formatDualCurrencyMinorUnits, STORE_PROFILE, StoreProfile } from "@retail/kernel";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmationDialogComponent } from "@app/shared-ui/confirmation-dialog/confirmation-dialog.component";

@Component({
  selector: "app-sale-detail",
  imports: [DatePipe, DetailPageHeaderComponent, EmptyStateComponent, MatCardModule, TranslatePipe,],
  providers: [SalesFacade],
  templateUrl: "./sale-detail.component.html",
  styleUrl: "./sale-detail.component.scss",
})
export class SaleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(SalesFacade);
  private readonly storeProfile: StoreProfile = inject(STORE_PROFILE);
  private readonly dialog = inject(MatDialog);

  protected readonly detail = signal<SaleDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly reversing = signal(false);


  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get("saleId");
      if (id) this.detail.set((await this.facade.get(id)) ?? null);
    } catch {
      this.detail.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected goBack(): void {
    void this.router.navigate(["/sales"]);
  }

  protected dualAmount(amount: number, snapshot: SaleCurrencySnapshot): string {
    return formatDualCurrencyMinorUnits(
      amount,
      snapshot.primary_precision,
      snapshot.primary_code,
      snapshot.exchange_rate,
      this.storeProfile.currency.secondary.code,
      this.storeProfile.currency.secondary.precision
    );
  }

  protected secondaryAmount(amount: number, snapshot: SaleCurrencySnapshot): string {
    return `${formatCurrencyMinorUnits(amount, snapshot.secondary_precision)} ${snapshot.secondary_code}`;
  }

  protected allocationsFor(item: SaleItem) {
    return this.detail()?.allocations.filter(allocation => allocation.sale_item_id === item.id) ?? [];
  }

  protected confirmReverse(): void {
  const sale = this.detail()?.sale;
  if (!sale || sale.reversed || sale.original_sale_id) return;

  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: "min(30rem, calc(100vw - 2rem))",
  });
  dialogRef.componentRef?.setInput("titleKey", "sales.reverseTitle");
  dialogRef.componentRef?.setInput("message", "sales.reverseMessage");
  dialogRef.afterClosed().subscribe(async confirmed => {
    if (confirmed === true) {
      this.reversing.set(true);
      const success = await this.facade.reverse(sale.id);
      this.reversing.set(false);
      if (success) {
        this.detail.set((await this.facade.get(sale.id)) ?? null);
      }
    }
  });
}
}
