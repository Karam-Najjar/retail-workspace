import { Injectable, OnDestroy } from '@angular/core';

interface PosMessage { readonly type: 'claim' | 'deny'; readonly owner: string; }

@Injectable({ providedIn: 'root' })
export class MultiTabService implements OnDestroy {
  private readonly channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('retail-pos');
  private readonly owner = crypto.randomUUID();
  private posOwned = false;
  private denied = false;
  constructor() { this.channel?.addEventListener('message', (event: MessageEvent<unknown>) => { if (!this.isMessage(event.data) || event.data.owner === this.owner) return; if (event.data.type === 'claim' && this.posOwned) this.channel?.postMessage({ type: 'deny', owner: event.data.owner } satisfies PosMessage); if (event.data.type === 'deny' && event.data.owner === this.owner) this.denied = true; }); }
  async claimPos(): Promise<boolean> { this.denied = false; this.channel?.postMessage({ type: 'claim', owner: this.owner } satisfies PosMessage); await new Promise<void>((resolve) => setTimeout(resolve, 150)); if (this.denied) return false; this.posOwned = true; return true; }
  releasePos(): void { this.posOwned = false; }
  ngOnDestroy(): void { this.channel?.close(); }
  private isMessage(value: unknown): value is PosMessage { return !!value && typeof value === 'object' && ['claim', 'deny'].includes((value as { type?: unknown }).type as string) && typeof (value as { owner?: unknown }).owner === 'string'; }
}
