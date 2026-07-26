import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SupplyDetail } from '@retail/kernel';
import { DetailPageHeaderComponent } from '../../../shared-ui/detail-page-header/detail-page-header.component';
import { SuppliesFacade } from '../supplies.facade';

@Component({ selector: 'app-supply-detail', imports: [DatePipe, DetailPageHeaderComponent, MatCardModule, TranslatePipe], providers: [SuppliesFacade], templateUrl: './supply-detail.component.html', styleUrl: './supply-detail.component.scss' })
export class SupplyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly facade = inject(SuppliesFacade);
  protected readonly detail = signal<SupplyDetail | null>(null);
  async ngOnInit(): Promise<void> { const id = this.route.snapshot.paramMap.get('supplyId'); if (id) this.detail.set((await this.facade.get(id)) ?? null); }
  protected goBack(): void { void this.router.navigate(['/supplies']); }
  protected primaryTotal(detail: SupplyDetail): string { const snapshot = detail.supply.currency_snapshot; return `${(detail.supply.total_cost / 10 ** snapshot.primary_precision).toFixed(snapshot.primary_precision)} ${snapshot.primary_code}`; }
  protected secondaryTotal(detail: SupplyDetail): string { const snapshot = detail.supply.currency_snapshot; return `${(snapshot.secondary_total_cost / 10 ** snapshot.secondary_precision).toFixed(snapshot.secondary_precision)} ${snapshot.secondary_code}`; }
}
