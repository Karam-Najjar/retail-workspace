import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SaleCurrencySnapshot, SaleListFilter, StoreProfileService } from '@retail/kernel';
import { DataTableColumn, DataTableComponent, DataTableRow } from '../../../shared-ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { SalesFacade } from '../sales.facade';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-sale-list',
  imports: [
    DataTableComponent,
    EmptyStateComponent,
    FormsModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
  ],
  providers: [SalesFacade],
  templateUrl: './sale-list.component.html',
  styleUrl: './sale-list.component.scss',
})
export class SaleListComponent implements OnInit {
  protected readonly facade = inject(SalesFacade);
  private readonly router = inject(Router);
  private readonly profile = inject(StoreProfileService);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected preset: DatePreset = 'today';
  protected customFrom = '';
  protected customTo = '';
  protected readonly columns: readonly DataTableColumn[] = [
    { labelKey: 'sales.dateTime' },
    { labelKey: 'sales.saleTotal' },
    { labelKey: 'sales.costTotal' },
    { labelKey: 'sales.profit' },
    { labelKey: 'sales.operator' },
  ];

  protected readonly rows = (): readonly DataTableRow[] => this.facade.sales().map(({ sale }) => ({
    id: sale.id,
    values: [
      this.dateFormatter.format(sale.date),
      this.formatPrimary(sale.total_amount, sale.currency_snapshot),
      this.formatPrimary(sale.total_cost, sale.currency_snapshot),
      this.formatPrimary(sale.total_profit, sale.currency_snapshot),
      sale.operator_name,
    ],
  }));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    void this.facade.load(this.filter());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/sales', id]);
  }

  protected summaryMoney(amount: number): string {
    const firstSale = this.facade.sales().at(0)?.sale;
    if (firstSale) return this.formatPrimary(amount, firstSale.currency_snapshot);

    const currency = this.profile.profile.currency.primary;
    return `${(amount / 10 ** currency.precision).toFixed(currency.precision)} ${currency.code}`;
  }

  private formatPrimary(amount: number, snapshot: SaleCurrencySnapshot): string {
    return `${(amount / 10 ** snapshot.primary_precision).toFixed(snapshot.primary_precision)} ${snapshot.primary_code}`;
  }

  private filter(): SaleListFilter {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    if (this.preset === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, -1);
    }
    if (this.preset === 'week') {
      const day = (now.getDay() + 6) % 7;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      to = now;
    }
    if (this.preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = now;
    }
    if (this.preset === 'custom') {
      from = this.customFrom ? new Date(`${this.customFrom}T00:00:00`) : undefined;
      to = this.customTo ? new Date(`${this.customTo}T23:59:59.999`) : undefined;
    }

    return { from, to };
  }
}
