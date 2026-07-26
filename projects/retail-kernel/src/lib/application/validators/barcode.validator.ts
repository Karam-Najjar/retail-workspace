export function normalizeBarcode(barcode: string): string {
  return barcode.trim().toLocaleLowerCase();
}

export function validateBarcode(barcode: string): string {
  const value = barcode.trim();
  if (!value) throw new Error('Barcode is required.');
  if (value.length > 100) throw new Error('Barcode must be 100 characters or fewer.');
  return value;
}
