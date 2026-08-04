import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "@ngx-translate/core";
import { Category, CreatePosProductUseCase, CurrencyService, ListCategoriesUseCase, PosProductCreationResult } from "@retail/kernel";
import { DualCurrencyInputComponent } from "../../../shared-ui/dual-currency-input/dual-currency-input.component";
import { NotificationService } from "../../../core/notifications/notification.service";

export interface UnknownProductCreateDialogData {
  readonly barcode: string;
}

@Component({
  selector: "app-unknown-product-create",
  imports: [
    DualCurrencyInputComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: "./unknown-product-create.component.html",
  styleUrl: "./unknown-product-create.component.scss",
})
export class UnknownProductCreateComponent implements OnInit {
  protected readonly data = inject(MAT_DIALOG_DATA) as UnknownProductCreateDialogData;
  private readonly dialogRef = inject(MatDialogRef<UnknownProductCreateComponent, PosProductCreationResult>);
  private readonly createProduct = inject(CreatePosProductUseCase);
  private readonly listCategories = inject(ListCategoriesUseCase);
  private readonly currency = inject(CurrencyService);
  private readonly notifications = inject(NotificationService);

  protected readonly categories = signal<readonly Category[]>([]);
  protected readonly exchangeRate = signal("");
  protected readonly ready = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected name = "";
  protected categoryId = "";
  protected sellingPriceCents = 0;
  protected openingQuantity = 1;
  protected unitCostCents = 0;

  async ngOnInit(): Promise<void> {
    try {
      const [categories, exchangeRate] = await Promise.all([this.listCategories.execute(), this.currency.currentExchangeRate()]);
      const other = categories.find(category => category.system_code === "other");
      if (!other) throw new Error("The default category could not be found.");
      this.categories.set(categories);
      this.categoryId = other.id;
      this.exchangeRate.set(exchangeRate);
      this.ready.set(true);
    } catch {
      this.error.set("products.errors.load");
    }
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    if (this.submitting() || !this.canSave()) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      const result = await this.createProduct.execute({
        barcode: this.data.barcode,
        name: this.name,
        sellingPriceCents: this.sellingPriceCents,
        categoryId: this.categoryId || undefined,
        openingQuantity: this.openingQuantity,
        unitCostCents: this.unitCostCents,
      });
      this.notifications.success("notifications.success.productSaved");
      this.dialogRef.close(result);
    } catch {
      this.error.set("pos.createProductFailed");
    } finally {
      this.submitting.set(false);
    }
  }

  protected canSave(): boolean {
    const name = this.name.trim();
    return (
      this.ready() &&
      name.length > 0 &&
      name.length <= 100 &&
      Number.isSafeInteger(this.sellingPriceCents) &&
      this.sellingPriceCents > 0 &&
      Number.isSafeInteger(this.openingQuantity) &&
      this.openingQuantity > 0 &&
      Number.isSafeInteger(this.unitCostCents) &&
      this.unitCostCents > 0
    );
  }
}
