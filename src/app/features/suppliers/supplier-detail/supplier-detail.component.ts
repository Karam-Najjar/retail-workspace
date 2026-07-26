import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Supplier } from '@retail/kernel';
import { ConfirmationDialogComponent } from '../../../shared-ui/confirmation-dialog/confirmation-dialog.component';
import { DetailPageHeaderComponent } from '../../../shared-ui/detail-page-header/detail-page-header.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { SuppliersFacade } from '../suppliers.facade';
import { SupplierFormComponent } from '../supplier-form/supplier-form.component';

@Component({
  selector: 'app-supplier-detail',
  imports: [ConfirmationDialogComponent, DetailPageHeaderComponent, EmptyStateComponent, MatButtonModule, MatCardModule, MatDialogModule, TranslatePipe],
  providers: [SuppliersFacade],
  templateUrl: './supplier-detail.component.html',
  styleUrl: './supplier-detail.component.scss',
})
export class SupplierDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly facade = inject(SuppliersFacade);
  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly confirmDelete = signal(false);
  protected readonly affectedSupplies = signal(0);
  protected error: string | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('supplierId');
    if (id) this.supplier.set((await this.facade.get(id)) ?? null);
  }

  goBack(): void { void this.router.navigate(['/suppliers']); }

  edit(): void {
    const id = this.supplier()?.id;
    if (id) {
      this.dialog.open(SupplierFormComponent, { width: 'min(42rem, calc(100vw - 2rem))', data: { supplierId: id } })
        .afterClosed().subscribe(() => void this.reload());
    }
  }

  async prepareDelete(): Promise<void> {
    const supplier = this.supplier();
    if (!supplier) return;
    this.affectedSupplies.set(await this.facade.countAffectedSupplies(supplier.id));
    this.confirmDelete.set(true);
  }

  async delete(): Promise<void> {
    const supplier = this.supplier();
    if (!supplier) return;
    const deleted = await this.facade.delete(supplier);
    if (deleted !== null) this.goBack();
    else this.error = this.facade.error();
  }

  private async reload(): Promise<void> {
    const id = this.supplier()?.id;
    if (id) this.supplier.set((await this.facade.get(id)) ?? null);
  }
}
