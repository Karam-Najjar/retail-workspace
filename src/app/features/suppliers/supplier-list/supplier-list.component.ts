import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Supplier } from '@retail/kernel';
import { ConfirmationDialogComponent } from '../../../shared-ui/confirmation-dialog/confirmation-dialog.component';
import { DataTableColumn, DataTableComponent, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { SuppliersFacade } from '../suppliers.facade';
import { SupplierFormComponent } from '../supplier-form/supplier-form.component';

@Component({ selector: 'app-supplier-list', imports: [DataTableComponent, EmptyStateComponent, MatButtonModule, MatDialogModule, TranslatePipe], providers: [SuppliersFacade], templateUrl: './supplier-list.component.html', styleUrl: './supplier-list.component.scss' })
export class SupplierListComponent implements OnInit {
  protected readonly facade = inject(SuppliersFacade); private readonly router = inject(Router); private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  protected readonly selectedSupplier = signal<Supplier | null>(null); protected readonly affectedSupplies = signal(0);
  protected readonly columns: readonly DataTableColumn[] = [{ labelKey: 'suppliers.name' }, { labelKey: 'suppliers.phone' }, { labelKey: 'suppliers.address' }];
  readonly rows = (): readonly DataTableRow[] => this.facade.suppliers().map((supplier) => ({ id: supplier.id, values: [supplier.name, supplier.phone || '—', supplier.address || '—'] }));
  ngOnInit(): void { void this.facade.load(); }
  openCreate(): void { this.dialog.open(SupplierFormComponent, { width: 'min(42rem, calc(100vw - 2rem))' }).afterClosed().subscribe(() => void this.facade.load()); }
  openDetail(id: string): void { void this.router.navigate(['/suppliers', id]); }
  edit(id: string): void { this.dialog.open(SupplierFormComponent, { width: 'min(42rem, calc(100vw - 2rem))', data: { supplierId: id } }).afterClosed().subscribe(() => void this.facade.load()); }
  async prepareDelete(id: string): Promise<void> { const supplier = this.facade.suppliers().find((item) => item.id === id); if (!supplier) return; this.selectedSupplier.set(supplier); const count = await this.facade.countAffectedSupplies(id); this.affectedSupplies.set(count); const dialogRef = this.dialog.open(ConfirmationDialogComponent, { width: 'min(30rem, calc(100vw - 2rem))' }); dialogRef.componentRef?.setInput('titleKey', 'suppliers.deleteTitle'); dialogRef.componentRef?.setInput('message', String(this.translate.instant('suppliers.deleteMessage', { count, name: supplier.name }))); dialogRef.afterClosed().subscribe((confirmed) => { if (confirmed === true) void this.deleteSelected(); else this.selectedSupplier.set(null); }); }
  async deleteSelected(): Promise<void> { const supplier = this.selectedSupplier(); if (!supplier) return; if ((await this.facade.delete(supplier)) !== null) this.selectedSupplier.set(null); }
}
