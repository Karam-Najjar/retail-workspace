import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Supplier } from '@retail/kernel';
import { LineItemEditorComponent } from '../../../shared-ui/line-item-editor/line-item-editor.component';
import { SupplierPickerComponent } from '../../../shared-ui/supplier-picker/supplier-picker.component';
import { SupplierFormComponent } from '../../suppliers/supplier-form/supplier-form.component';
import { SuppliesFacade } from '../supplies.facade';
import { SupplyLineDraft, SupplyLineEditorComponent } from '../supply-line-editor/supply-line-editor.component';

@Component({ selector: 'app-add-stock-form', imports: [FormsModule, LineItemEditorComponent, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, SupplierPickerComponent, SupplyLineEditorComponent, TranslatePipe], providers: [SuppliesFacade], templateUrl: './add-stock-form.component.html', styleUrl: './add-stock-form.component.scss' })
export class AddStockFormComponent implements OnInit {
  protected readonly facade = inject(SuppliesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<AddStockFormComponent>, { optional: true });
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true });
  protected readonly ready = signal(false);
  protected readonly supplierId = signal('');
  protected readonly lines = signal<readonly SupplyLineDraft[]>([]);
  protected readonly exchangeRate = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly openedAt = new Date();
  protected dateValue = this.toDateTimeValue(this.openedAt);

  async ngOnInit(): Promise<void> {
    void this.route; void this.dialogData;
    try { this.exchangeRate.set(await this.facade.loadFormData()); this.addLine(); }
    catch (error: unknown) { this.error.set(error instanceof Error ? error.message : 'supplies.errors.load'); }
    finally { this.ready.set(true); }
  }

  protected addLine(): void {
    this.lines.update((lines) => [...lines, { clientId: crypto.randomUUID(), productId: '', packageTypeCode: this.facade.packageTypes[0]?.code ?? '', quantityReceived: 1, unitCostEntered: 0 }]);
  }
  protected updateLine(index: number, line: SupplyLineDraft): void { this.lines.update((lines) => lines.map((current, currentIndex) => currentIndex === index ? line : current)); }
  protected removeLine(index: number): void { this.lines.update((lines) => lines.filter((_, currentIndex) => currentIndex !== index)); }
  protected totalCost(): number { return this.lines().reduce((sum, line) => sum + line.quantityReceived * line.unitCostEntered, 0); }
  protected totalBaseUnits(): number { return this.lines().reduce((sum, line) => sum + line.quantityReceived * (this.facade.packageTypes.find((type) => type.code === line.packageTypeCode)?.multiplier ?? 0), 0); }
  protected maxDateValue(): string { return this.toDateTimeValue(new Date()); }

  protected quickAddSupplier(): void {
    this.dialog.open(SupplierFormComponent, { width: 'min(42rem, calc(100vw - 2rem))' }).afterClosed().subscribe((supplier: Supplier | undefined) => {
      if (!supplier) return;
      this.facade.addSupplier(supplier); this.supplierId.set(supplier.id);
    });
  }

  protected close(): void { if (this.dialogRef) this.dialogRef.close(); else void this.router.navigate(['/supplies']); }
  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null); this.submitting.set(true);
    const supply = await this.facade.receive({ supplierId: this.supplierId(), date: new Date(this.dateValue), lines: this.lines().map((line) => ({ productId: line.productId, packageTypeCode: line.packageTypeCode, quantityReceived: line.quantityReceived, unitCostEntered: line.unitCostEntered })) });
    this.submitting.set(false);
    if (supply) { if (this.dialogRef) this.dialogRef.close(supply); else void this.router.navigate(['/supplies', supply.id]); }
    else this.error.set(this.facade.error());
  }

  private toDateTimeValue(date: Date): string {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
