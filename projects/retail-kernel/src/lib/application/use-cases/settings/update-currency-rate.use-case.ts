import { Injectable } from "@angular/core";

const DECIMAL_INPUT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const MAX_DECIMAL_LENGTH = 64;

export function normalizePositiveDecimal(value: string): string | null {
  const input = value.trim();
  if (!input || input.length > MAX_DECIMAL_LENGTH || !DECIMAL_INPUT_PATTERN.test(input)) return null;
  const [integer, fraction = ""] = input.split(".");
  const normalizedFraction = fraction.replace(/0+$/, "");
  const normalized = normalizedFraction ? `${integer}.${normalizedFraction}` : integer;
  return normalized === "0" ? null : normalized;
}

@Injectable({ providedIn: "root" })
export class UpdateCurrencyRateUseCase {
  execute(value: string): string {
    const normalized = normalizePositiveDecimal(value);
    if (!normalized) throw new Error("Currency rate must be a positive decimal value.");
    return normalized;
  }
}
