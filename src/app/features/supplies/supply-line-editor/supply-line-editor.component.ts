import { Component, inject, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "@ngx-translate/core";
import { DexieInventoryBatchRepository, Product, StorePackageType } from "@retail/kernel";
import { DualCurrencyInputComponent } from "../../../shared-ui/dual-currency-input/dual-currency-input.component";
import { ProductPickerComponent } from "../../../shared-ui/product-picker/product-picker.component";

export interface SupplyLineDraft {
  readonly clientId: string;
  readonly productId: string;
  readonly packageTypeCode: string;
  readonly quantityReceived: number;
  readonly unitCostEntered: number;
}

@Component({
  selector: "app-supply-line-editor",
  imports: [
    DualCurrencyInputComponent,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ProductPickerComponent,
    TranslatePipe,
  ],
  templateUrl: "./supply-line-editor.component.html",
  styleUrl: "./supply-line-editor.component.scss",
})
export class SupplyLineEditorComponent {
  private readonly batches = inject(DexieInventoryBatchRepository);
  private autofillRequest = 0;
  readonly line = input.required<SupplyLineDraft>();
  readonly products = input.required<readonly Product[]>();
  readonly packageTypes = input.required<readonly StorePackageType[]>();
  readonly exchangeRate = input.required<string>();
  readonly lineChange = output<SupplyLineDraft>();
  readonly remove = output<void>();

  protected update(values: Partial<SupplyLineDraft>): void {
    this.lineChange.emit({ ...this.line(), ...values });
  }
  protected async selectProduct(productId: string): Promise<void> {
    this.update({ productId });
    await this.autofill(productId, this.line().packageTypeCode);
  }
  protected async selectPackage(packageTypeCode: string): Promise<void> {
    this.update({ packageTypeCode });
    await this.autofill(this.line().productId, packageTypeCode);
  }
  protected multiplier(): number {
    return this.packageTypes().find(type => type.code === this.line().packageTypeCode)?.multiplier ?? 0;
  }
  protected baseUnits(): number {
    return this.line().quantityReceived * this.multiplier();
  }
  protected subtotal(): number {
    return this.line().quantityReceived * this.line().unitCostEntered;
  }
  protected baseUnitCost(): string {
    const multiplier = this.multiplier();
    return multiplier ? String(this.line().unitCostEntered / multiplier / 100) : "0";
  }

  private async autofill(productId: string, packageTypeCode: string): Promise<void> {
    const request = ++this.autofillRequest;
    const multiplier = this.packageTypes().find(type => type.code === packageTypeCode)?.multiplier;
    if (!productId || !multiplier) return;
    const productBatches = await this.batches.listByProduct(productId);
    if (request !== this.autofillRequest) return;
    const latest = productBatches.at(-1);
    this.update({ unitCostEntered: latest ? Math.round(Number(latest.unit_cost_display) * multiplier * 100) : 0 });
  }
}
