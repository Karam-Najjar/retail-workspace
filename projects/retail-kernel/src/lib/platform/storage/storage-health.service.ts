import { Injectable } from '@angular/core';

export interface StorageHealth { readonly available: boolean; readonly quota: number | null; readonly usage: number | null; readonly persisted: boolean; readonly low_space: boolean; }

@Injectable({ providedIn: 'root' })
export class StorageHealthService {
  async getHealth(): Promise<StorageHealth> { if (!('indexedDB' in globalThis) || !navigator.storage) return { available: false, quota: null, usage: null, persisted: false, low_space: false }; const [estimate, persisted] = await Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.() ?? Promise.resolve(false)]); const quota = estimate.quota ?? null; const usage = estimate.usage ?? null; return { available: true, quota, usage, persisted, low_space: quota !== null && usage !== null && quota > 0 && (quota - usage) / quota < .1 }; }
  async requestPersistence(): Promise<boolean> { return navigator.storage?.persist?.() ?? false; }
}
