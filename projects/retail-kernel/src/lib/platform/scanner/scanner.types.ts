import { InjectionToken, Signal } from "@angular/core";

export type ScannerStatus = "inactive" | "ready";

export interface ScannerGateway {
  readonly status: Signal<ScannerStatus>;
  activate(onBarcode: (barcode: string) => void): void;
  deactivate(): void;
}

export const SCANNER_GATEWAY = new InjectionToken<ScannerGateway>("SCANNER_GATEWAY");
