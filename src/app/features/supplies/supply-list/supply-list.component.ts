import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SupplyListFilter } from '@retail/kernel';
import { DataTableColumn, DataTableComponent, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { AddStockFormComponent } from '../add-stock-form/add-stock-form.component';
import { SuppliesFacade } from '../supplies.facade';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

@Component({ selector: 'app-supply-list', imports: [DataTableComponent, EmptyStateComponent, FormsModule, MatButtonModule, MatButtonToggleModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe], providers: [SuppliesFacade], templateUrl: './supply-list.component.html', styleUrl: './supply-list.component.scss' })
export class SupplyListComponent implements OnInit {
  protected readonly facade = inject(SuppliesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  protected preset: DatePreset = 'today'; protected supplierId = ''; protected customFrom = ''; protected customTo = '';
  protected readonly columns: readonly DataTableColumn[] = [{ labelKey: 'supplies.dateTime' }, { labelKey: 'supplies.supplier' }, { labelKey: 'supplies.itemsCount' }, { labelKey: 'supplies.totalCost' }, { labelKey: 'supplies.operator' }];
  protected readonly rows = (): readonly DataTableRow[] => this.facade.supplies().map(({ supply, itemCount }) => ({ id: supply.id, values: [this.dateFormatter.format(supply.date), supply.supplier_name, String(itemCount), `${(supply.total_cost / 100).toFixed(2)} ${supply.currency_snapshot.primary_code}`, supply.operator_name] }));
  ngOnInit(): void { this.load(); }
  protected load(): void { void this.facade.load(this.filter()); }
  protected openCreate(): void { this.dialog.open(AddStockFormComponent, { width: 'min(72rem, calc(100vw - 2rem))', maxHeight: 'calc(100vh - 2rem)' }).afterClosed().subscribe((result) => { if (result) this.load(); }); }
  protected openDetail(id: string): void { void this.router.navigate(['/supplies', id]); }

  private filter(): SupplyListFilter {
    const now = new Date(); let from: Date | undefined; let to: Date | undefined;
    if (this.preset === 'today') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1); }
    if (this.preset === 'week') { const day = (now.getDay() + 6) % 7; from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day); to = now; }
    if (this.preset === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1); to = now; }
    if (this.preset === 'custom') { from = this.customFrom ? new Date(`${this.customFrom}T00:00:00`) : undefined; to = this.customTo ? new Date(`${this.customTo}T23:59:59.999`) : undefined; }
    return { supplierId: this.supplierId || undefined, from, to };
  }
}
