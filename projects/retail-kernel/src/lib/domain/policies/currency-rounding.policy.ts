import Decimal from "decimal.js";

export const CURRENCY_ROUNDING_POLICY = "nearest_minor_unit" as const;

export function roundCurrencyMinorUnits(value: Decimal.Value): number {
  const amount = new Decimal(value);
  if (!amount.isFinite() || amount.isNegative()) throw new Error("Currency value must be a non-negative finite number.");
  const rounded = amount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (rounded.greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error("Currency value is too large.");
  return rounded.toNumber();
}

export function sumCurrencyMinorUnits(values: Iterable<number>): number {
  let total = new Decimal(0);
  for (const value of values) {
    assertSafeCurrencyMinorUnits(value);
    total = total.plus(value);
  }
  return toSafeInteger(total, "Currency total is too large.");
}

export function multiplyCurrencyMinorUnits(unitAmount: number, quantity: number): number {
  assertNonNegativeSafeInteger(unitAmount, "Currency value must be a non-negative safe integer.");
  assertNonNegativeSafeInteger(quantity, "Currency quantity must be a non-negative safe integer.");
  return toSafeInteger(new Decimal(unitAmount).mul(quantity), "Currency total is too large.");
}

export function convertCurrencyMinorUnits(
  value: number,
  exchangeRate: Decimal.Value,
  primaryPrecision: number,
  secondaryPrecision: number
): number {
  assertSafeCurrencyMinorUnits(value);
  const rate = new Decimal(exchangeRate);
  if (!rate.isFinite() || !rate.isPositive()) throw new Error("Currency exchange rate must be a positive finite number.");

  const converted = new Decimal(value)
    .div(currencyScale(primaryPrecision))
    .mul(rate)
    .mul(currencyScale(secondaryPrecision));
  const roundedMagnitude = roundCurrencyMinorUnits(converted.abs());
  return converted.isNegative() ? -roundedMagnitude : roundedMagnitude;
}

export function currencyMinorUnitsToMajor(value: number, precision: number): number {
  assertSafeCurrencyMinorUnits(value);
  return new Decimal(value).div(currencyScale(precision)).toNumber();
}

export function formatCurrencyMinorUnits(value: number, precision: number): string {
  assertSafeCurrencyMinorUnits(value);
  return new Decimal(value).div(currencyScale(precision)).toFixed(precision);
}

function assertSafeCurrencyMinorUnits(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error("Currency value must be a safe integer.");
}

function assertNonNegativeSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(message);
}

function currencyScale(precision: number): Decimal {
  if (!Number.isSafeInteger(precision) || precision < 0) throw new Error("Currency precision must be a non-negative safe integer.");
  return new Decimal(10).pow(precision);
}

function toSafeInteger(value: Decimal, unsafeMessage: string): number {
  if (!value.isFinite() || !value.isInteger()) throw new Error("Currency value must be a finite integer.");
  if (value.abs().greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error(unsafeMessage);
  return value.toNumber();
}
