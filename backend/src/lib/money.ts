export function amountToCents(value: number | string) {
  const numeric = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(numeric)) {
    throw new Error('El monto debe ser numérico.');
  }

  return Math.round(numeric * 100);
}

export function centsToAmount(cents: number) {
  return Number((cents / 100).toFixed(2));
}
