import { inject, Injectable, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate);
  readonly ready = signal(false);
  constructor() { this.updates.versionUpdates.subscribe((event) => { if (event.type === 'VERSION_READY') this.ready.set(true); }); }
  async apply(): Promise<void> { if (this.ready() && await this.updates.activateUpdate()) location.reload(); }
}
