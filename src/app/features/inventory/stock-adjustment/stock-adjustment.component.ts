import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { DexieSettingsRepository, InventoryAdjustmentType, Product } from "@retail/kernel";
import { DualCurrencyInputComponent } from "../../../shared-ui/dual-currency-input/dual-currency-input.component";
import { ProductsFacade } from "../../products/products.facade";

type StockAdjustmentType = Extract<InventoryAdjustmentType, "opening_balance" | "adjustment_in" | "adjustment_out" | "write_off">;
export interface StockAdjustmentDialogData {
  readonly productId: string;
  readonly initialType?: StockAdjustmentType;
}
export interface StockAdjustmentResult {
  readonly deleted: boolean;
}

@Component({
  selector: "app-stock-adjustment",
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DualCurrencyInputComponent,
    TranslatePipe,
  ],
  providers: [ProductsFacade],
  templateUrl: "./stock-adjustment.component.html",
  styleUrl: "./stock-adjustment.component.scss",
})
export class StockAdjustmentComponent implements OnInit {
  private readonly facade = inject(ProductsFacade);
  private readonly settings = inject(DexieSettingsRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<StockAdjustmentComponent, StockAdjustmentResult>, { optional: true });
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as StockAdjustmentDialogData | null;

  protected readonly submitting = signal(false);
  protected readonly writeOffOnly = this.data?.initialType === "write_off";
  protected readonly product = signal<Product | null>(null);
  protected type: StockAdjustmentType = "adjustment_in";
  protected quantity = 1;
  protected unitCostCents = 0;
  protected readonly exchangeRate = signal("0");
  protected reason = "";
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const productId = this.data?.productId ?? this.route.snapshot.paramMap.get("productId");
    if (!productId) {
      this.error.set("Product could not be found.");
      return;
    }
    const [detail, settings] = await Promise.all([this.facade.get(productId), this.settings.get()]);
    const product = detail?.product ?? null;
    this.product.set(product);
    this.exchangeRate.set(settings?.currency_rate ?? "0");
    if (!product) {
      this.error.set("Product could not be found.");
      return;
    }
    this.type = this.data?.initialType ?? (product.quantity === 0 ? "opening_balance" : "adjustment_in");
    this.syncTypeValues();
  }

  protected availableTypes(): readonly StockAdjustmentType[] {
    if (this.writeOffOnly) return ["write_off"];
    return this.product()?.quantity === 0 ? ["opening_balance"] : ["adjustment_in", "adjustment_out", "write_off"];
  }

  protected showsUnitCost(): boolean {
    return this.type === "opening_balance" || this.type === "adjustment_in";
  }
  protected isWriteOff(): boolean {
    return this.type === "write_off";
  }
  protected typeChanged(): void {
    this.syncTypeValues();
  }

  protected async save(): Promise<void> {
    const product = this.product();
    if (this.submitting() || !product) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      let succeeded = false;
      if (this.type === "opening_balance")
        succeeded = await this.facade.createOpeningBalance(product.id, this.quantity, this.unitCostCents, this.reason);
      else if (this.type === "adjustment_in") succeeded = await this.facade.addStock(product.id, this.quantity, this.unitCostCents, this.reason);
      else if (this.type === "adjustment_out") succeeded = await this.facade.removeStock(product.id, this.quantity, this.reason);
      else succeeded = await this.facade.writeOffAndDelete(product.id, this.reason);
      if (!succeeded) {
        this.error.set(this.facade.error());
        return;
      }
      this.close(this.type === "write_off");
    } finally {
      this.submitting.set(false);
    }
  }

  protected cancel(): void {
    this.close(false, true);
  }

  private syncTypeValues(): void {
    if (this.type === "write_off") this.quantity = this.product()?.quantity ?? 0;
    else if (this.quantity <= 0) this.quantity = 1;
    if (!this.showsUnitCost()) this.unitCostCents = 0;
  }

  private close(deleted: boolean, cancelled = false): void {
    if (this.dialogRef) {
      this.dialogRef.close(cancelled ? undefined : { deleted });
      return;
    }
    if (deleted) void this.router.navigateByUrl("/products");
    else void this.router.navigate([{ outlets: { modal: null } }]);
  }
}
