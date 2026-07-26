import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SaleCurrencySnapshot, SaleDetail } from '@retail/kernel';
import { DetailPageHeaderComponent } from '../../../shared-ui/detail-page-header/detail-page-header.component';
import { EmptyStateComponent } from '../../../shared-ui/empty-state/empty-state.component';
import { SalesFacade } from '../sales.facade';

@Component({
  selector: 'app-sale-detail',
  imports: [DatePipe, DetailPageHeaderComponent, EmptyStateComponent, MatCardModule, TranslatePipe],
  providers: [SalesFacade],
  templateUrl: './sale-detail.component.html',
  styleUrl: './sale-detail.component.scss',
})
export class SaleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(SalesFacade);

  protected readonly detail = signal<SaleDetail | null>(null);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('saleId');
      if (id) this.detail.set((await this.facade.get(id)) ?? null);
    } catch {
      this.detail.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/sales']);
  }

  protected primaryAmount(amount: number, snapshot: SaleCurrencySnapshot): string {
    return `${(amount / 10 ** snapshot.primary_precision).toFixed(snapshot.primary_precision)} ${snapshot.primary_code}`;
  }

  protected secondaryAmount(amount: number, snapshot: SaleCurrencySnapshot): string {
    return `${(amount / 10 ** snapshot.secondary_precision).toFixed(snapshot.secondary_precision)} ${snapshot.secondary_code}`;
  }
}
