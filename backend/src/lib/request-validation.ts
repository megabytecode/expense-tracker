export function parseRequiredString(value: unknown, fieldLabel: string) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldLabel} es obligatorio.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldLabel} es obligatorio.`);
  }

  return trimmed;
}

export function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('El texto enviado no es válido.');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseFiniteNumber(value: unknown, fieldLabel: string) {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldLabel} debe ser un número válido.`);
  }

  return numeric;
}

export function parsePositiveAmount(value: unknown, fieldLabel = 'El monto') {
  const numeric = parseFiniteNumber(value, fieldLabel);

  if (numeric <= 0) {
    throw new Error(`${fieldLabel} debe ser mayor que cero.`);
  }

  return numeric;
}

export function parseRequiredDate(value: unknown, fieldLabel: string) {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(`${fieldLabel} es obligatoria.`);
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel} no es válida.`);
  }

  return parsed;
}

export function parseArray(value: unknown, fieldLabel: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldLabel} debe enviarse como una lista.`);
  }

  return value;
}
