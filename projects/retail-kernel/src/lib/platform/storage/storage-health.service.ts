import { Injectable } from '@angular/core';

export interface StorageHealth {
  readonly available: boolean;
  readonly quota: number | null;
  readonly usage: number | null;
}

@Injectable({ providedIn: 'root' })
export class StorageHealthService {
  async getHealth(): Promise<StorageHealth> {
    if (!('indexedDB' in globalThis)) {
      return { available: false, quota: null, usage: null };
    }

    const estimate = await navigator.storage?.estimate();
    return {
      available: true,
      quota: estimate?.quota ?? null,
      usage: estimate?.usage ?? null,
    };
  }
}
