import { Component, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import {
  DexieProductRepository,
  DexieSettingsRepository,
  ManageProductBarcodesUseCase,
  ProductBarcodeInput,
  STORE_PROFILE,
  StoreProfile,
  normalizeBarcode,
  validateBarcode,
} from "@retail/kernel";
import { BarcodeInputComponent } from "../../../shared-ui/barcode-input/barcode-input.component";
import { DualCurrencyInputComponent } from "../../../shared-ui/dual-currency-input/dual-currency-input.component";
import { ModalFormShellComponent } from "../../../shared-ui/modal-form-shell/modal-form-shell.component";
import { ProductsFacade } from "../products.facade";
import { MatIcon } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";

interface EditableBarcode {
  readonly id?: string;
  barcode: string;
  package_type_code: string;
  multiplier: number;
}

@Component({
  selector: "app-product-form",
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ModalFormShellComponent,
    DualCurrencyInputComponent,
    BarcodeInputComponent,
    TranslatePipe,
    MatIcon,
    MatButtonModule
],
  providers: [ProductsFacade],
  templateUrl: "./product-form.component.html",
  styleUrl: "./product-form.component.scss",
})
export class ProductFormComponent implements OnInit {
  protected readonly facade = inject(ProductsFacade);
  protected readonly profile: StoreProfile = inject(STORE_PROFILE);
  private readonly settings = inject(DexieSettingsRepository);
  private readonly repository = inject(DexieProductRepository);
  private readonly manageBarcodes = inject(ManageProductBarcodesUseCase);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<ProductFormComponent>, { optional: true });
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as { productId?: string } | null;
  protected productId: string | undefined;
  protected name = "";
  protected categoryId = "";
  protected sellingPrice = 0;
  protected exchangeRate = "0";
  protected barcodes: EditableBarcode[] = [];
  protected error: string | null = null;
  protected readonly submitting = signal(false);
  async ngOnInit(): Promise<void> {
    await this.facade.load();
    this.categoryId = this.defaultCategoryId();
    this.exchangeRate = (await this.settings.get())?.currency_rate ?? "0";
    this.productId = this.data?.productId ?? this.route.snapshot.paramMap.get("productId") ?? undefined;
    if (this.productId) {
      const detail = await this.facade.get(this.productId);
      if (detail) {
        this.name = detail.product.name;
        this.categoryId = detail.product.category_id;
        this.sellingPrice = detail.product.selling_price;
        this.barcodes = detail.barcodes.map(barcode => ({
          id: barcode.id,
          barcode: barcode.barcode,
          package_type_code: barcode.package_type_code,
          multiplier: barcode.multiplier,
        }));
      }
    }
  }
  close(): void {
    if (this.dialogRef) this.dialogRef.close();
    else void this.router.navigate(["/products"]);
  }
  addBarcode(): void {
    const type = this.profile.package_types.find(item => !this.isPackageAssigned(item.code));
    if (type && this.barcodes.length < 2) this.barcodes.push({ barcode: "", package_type_code: type.code, multiplier: type.multiplier });
  }
  removeBarcode(index: number): void {
    this.barcodes.splice(index, 1);
  }
  packageChanged(barcode: EditableBarcode): void {
    const type = this.profile.package_types.find(item => item.code === barcode.package_type_code);
    if (type) barcode.multiplier = type.multiplier;
  }
  canAddBarcode(): boolean {
    return this.barcodes.length < 2 && this.profile.package_types.some(item => !this.isPackageAssigned(item.code));
  }
  isPackageAssigned(packageTypeCode: string, current?: EditableBarcode): boolean {
    return this.barcodes.some(barcode => barcode !== current && barcode.package_type_code === packageTypeCode);
  }
  async save(): Promise<void> {
    if (this.submitting()) return;
    this.error = null;
    this.submitting.set(true);
    try {
      if (!this.name.trim()) throw new Error("Product name is required.");
      if (!Number.isInteger(this.sellingPrice) || this.sellingPrice <= 0) throw new Error("Selling price must be greater than zero.");
      await this.validateBarcodes();
      const product = await this.facade.save({
        id: this.productId,
        name: this.name,
        category_id: this.categoryId || this.defaultCategoryId(),
        selling_price: this.sellingPrice,
      });
      if (!product) {
        this.error = this.facade.error();
        return;
      }
      await this.manageBarcodes.execute(product.id, this.barcodes as readonly ProductBarcodeInput[]);
      if (this.dialogRef) this.dialogRef.close(product);
      else this.close();
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : "products.errors.barcodes";
    } finally {
      this.submitting.set(false);
    }
  }
  private defaultCategoryId(): string {
    return this.facade.categories().find(category => category.system_code === "other")?.id ?? "";
  }
  private async validateBarcodes(): Promise<void> {
    if (this.barcodes.length > 2) throw new Error("A product can have at most one pocket barcode and one carton barcode.");
    const normalized = new Set<string>();
    for (const barcode of this.barcodes) {
      const value = validateBarcode(barcode.barcode);
      if (this.isPackageAssigned(barcode.package_type_code, barcode)) throw new Error("Only one barcode is allowed for each package type.");
      const normalizedValue = normalizeBarcode(value);
      if (normalized.has(normalizedValue)) throw new Error("Each barcode can only be entered once.");
      normalized.add(normalizedValue);
      const existing = await this.repository.getByNormalizedBarcode(normalizedValue);
      if (existing && existing.id !== barcode.id) throw new Error("Barcode is already assigned to another product.");
    }
  }
}
