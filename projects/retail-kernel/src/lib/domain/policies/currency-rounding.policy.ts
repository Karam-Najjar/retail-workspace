export const CURRENCY_ROUNDING_POLICY = 'nearest_minor_unit' as const;

export function roundCurrencyMinorUnits(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Currency value must be a non-negative finite number.');
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded)) throw new Error('Currency value is too large.');
  return rounded;
}
