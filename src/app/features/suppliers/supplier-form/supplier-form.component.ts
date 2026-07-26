import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ModalFormShellComponent } from '../../../shared-ui/modal-form-shell/modal-form-shell.component';
import { SuppliersFacade } from '../suppliers.facade';

@Component({ selector: 'app-supplier-form', imports: [FormsModule, MatFormFieldModule, MatInputModule, ModalFormShellComponent, TranslatePipe], providers: [SuppliersFacade], templateUrl: './supplier-form.component.html', styleUrl: './supplier-form.component.scss' })
export class SupplierFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly facade = inject(SuppliersFacade);
  private readonly dialogRef = inject(MatDialogRef<SupplierFormComponent>, { optional: true }); private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as { supplierId?: string } | null;
  protected supplierId: string | undefined; protected name = ''; protected phone = ''; protected address = ''; protected notes = ''; protected error: string | null = null;
  async ngOnInit(): Promise<void> { this.supplierId = this.data?.supplierId ?? this.route.snapshot.paramMap.get('supplierId') ?? undefined; if (this.supplierId) { const supplier = await this.facade.get(this.supplierId); if (supplier) { this.name = supplier.name; this.phone = supplier.phone; this.address = supplier.address; this.notes = supplier.notes; } } }
  close(): void { if (this.dialogRef) this.dialogRef.close(); else void this.router.navigate(['/suppliers']); }
  async save(): Promise<void> { this.error = null; const supplier = await this.facade.save({ id: this.supplierId, name: this.name, phone: this.phone, address: this.address, notes: this.notes }); if (supplier) { if (this.dialogRef) this.dialogRef.close(supplier); else this.close(); } else this.error = this.facade.error(); }
}
