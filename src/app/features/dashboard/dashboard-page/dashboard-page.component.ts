import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { DashboardFacade } from '../dashboard.facade';

@Component({ selector: 'app-dashboard-page', imports: [MatButtonModule, MatCardModule, RouterLink, TranslatePipe], providers: [DashboardFacade], templateUrl: './dashboard-page.component.html', styleUrl: './dashboard-page.component.scss' })
export class DashboardPageComponent implements OnDestroy, OnInit {
  protected readonly facade = inject(DashboardFacade);
  protected readonly money = (value: number): string => (value / 100).toFixed(2);
  ngOnInit(): void { this.facade.load(); }
  ngOnDestroy(): void { this.facade.destroy(); }
}
