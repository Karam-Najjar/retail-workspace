import { Injectable } from "@angular/core";

export function isValidLowStockThreshold(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

@Injectable({ providedIn: "root" })
export class UpdateLowStockThresholdUseCase {
  execute(value: number): number {
    if (!isValidLowStockThreshold(value)) throw new Error("Low-stock threshold must be a nonnegative integer.");
    return value;
  }
}
