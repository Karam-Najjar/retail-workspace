import { DOCUMENT } from '@angular/common';
import { inject, Injectable, NgZone, signal } from '@angular/core';
import { ScannerGateway, ScannerStatus } from './scanner.types';

@Injectable({ providedIn: 'root' })
export class HidKeyboardTransport implements ScannerGateway {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly statusSignal = signal<ScannerStatus>('inactive');
  private buffer = '';
  private onBarcode: ((barcode: string) => void) | null = null;
  private readonly listener = (event: KeyboardEvent) => this.onKeydown(event);
  readonly status = this.statusSignal.asReadonly();

  activate(onBarcode: (barcode: string) => void): void {
    this.deactivate();
    this.buffer = '';
    this.onBarcode = onBarcode;
    this.document.addEventListener('keydown', this.listener);
    this.statusSignal.set('ready');
  }

  deactivate(): void {
    this.document.removeEventListener('keydown', this.listener);
    this.buffer = '';
    this.onBarcode = null;
    this.statusSignal.set('inactive');
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const barcode = this.buffer.trim();
      this.buffer = '';
      if (!event.defaultPrevented && barcode && this.onBarcode) this.zone.run(() => this.onBarcode?.(barcode));
      return;
    }
    if (!event.defaultPrevented && !event.ctrlKey && !event.altKey && !event.metaKey && event.key.length === 1) this.buffer += event.key;
  }
}
