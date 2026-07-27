import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardQueryService, DashboardSnapshot } from '@retail/kernel';

@Injectable()
export class DashboardFacade {
  private readonly query = inject(DashboardQueryService);
  readonly snapshot = signal<DashboardSnapshot | null>(null);
  readonly loading = signal(true);
  private subscription?: Subscription;
  load(): void { this.loading.set(true); this.subscription = this.query.watch().subscribe({ next: (snapshot) => { this.snapshot.set(snapshot); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  destroy(): void { this.subscription?.unsubscribe(); }
}
