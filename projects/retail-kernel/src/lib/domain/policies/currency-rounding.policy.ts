import Decimal from "decimal.js";

export const CURRENCY_ROUNDING_POLICY = "nearest_minor_unit" as const;

export function roundCurrencyMinorUnits(value: Decimal.Value): number {
  const amount = new Decimal(value);
  if (!amount.isFinite() || amount.isNegative()) throw new Error("Currency value must be a non-negative finite number.");
  const rounded = amount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (rounded.greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error("Currency value is too large.");
  return rounded.toNumber();
}
