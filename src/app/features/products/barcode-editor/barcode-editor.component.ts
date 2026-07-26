import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { STORE_PROFILE, StoreProfile } from '@retail/kernel';
import { BarcodeInputComponent } from '../../../shared-ui/barcode-input/barcode-input.component';
import { ModalFormShellComponent } from '../../../shared-ui/modal-form-shell/modal-form-shell.component';
import { ProductsFacade } from '../products.facade';

interface EditableBarcode { id?: string; barcode: string; package_type_code: string; multiplier: number; }
interface BarcodeEditorData { readonly productId: string; }

@Component({ selector: 'app-barcode-editor', imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, BarcodeInputComponent, ModalFormShellComponent, TranslatePipe], providers: [ProductsFacade], templateUrl: './barcode-editor.component.html', styleUrl: './barcode-editor.component.scss' })
export class BarcodeEditorComponent implements OnInit {
  private readonly facade = inject(ProductsFacade); protected readonly profile: StoreProfile = inject(STORE_PROFILE); private readonly data = inject(MAT_DIALOG_DATA) as BarcodeEditorData; private readonly dialogRef = inject(MatDialogRef<BarcodeEditorComponent>);
  protected readonly rows = signal<EditableBarcode[]>([]); protected readonly error = signal<string | null>(null);
  async ngOnInit(): Promise<void> { const detail = await this.facade.get(this.data.productId); this.rows.set(detail?.barcodes.map((barcode) => ({ id: barcode.id, barcode: barcode.barcode, package_type_code: barcode.package_type_code, multiplier: barcode.multiplier })) ?? []); }
  add(): void { const type = this.profile.package_types.find((item) => !this.isPackageAssigned(item.code)); if (type && this.rows().length < 2) this.rows.update((rows) => [...rows, { barcode: '', package_type_code: type.code, multiplier: type.multiplier }]); }
  remove(index: number): void { this.rows.update((rows) => rows.filter((_row, rowIndex) => rowIndex !== index)); }
  packageChanged(row: EditableBarcode): void { const type = this.profile.package_types.find((item) => item.code === row.package_type_code); if (type) { row.multiplier = type.multiplier; this.rows.update((rows) => [...rows]); } }
  canAdd(): boolean { return this.rows().length < 2 && this.profile.package_types.some((item) => !this.isPackageAssigned(item.code)); }
  isPackageAssigned(packageTypeCode: string, current?: EditableBarcode): boolean { return this.rows().some((row) => row !== current && row.package_type_code === packageTypeCode); }
  async save(): Promise<void> { const rows = this.rows(); if (rows.length > 2 || rows.some((row) => this.isPackageAssigned(row.package_type_code, row))) { this.error.set('Only one barcode is allowed for each package type.'); return; } const saved = await this.facade.saveBarcodes(this.data.productId, rows); if (saved) this.dialogRef.close(saved); else this.error.set(this.facade.error()); }
  close(): void { this.dialogRef.close(); }
}
