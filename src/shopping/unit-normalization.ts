export interface NormalizedPackage {
  readonly value: number;
  readonly unit: 'kg' | 'l' | 'piece';
}

const WEIGHT = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)(?:\s|$)/i;
const VOLUME = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(l|lt|ml)(?:\s|$)/i;
const PIECES = /(?:^|\s)(\d+)\s*(?:pcs?|pieces?|τεμ)(?:\s|$)/i;

function numeric(value: string): number {
  return Number(value.replace(',', '.'));
}

export function normalizePackageSize(text: string): NormalizedPackage | null {
  const weight = WEIGHT.exec(` ${text} `);
  if (weight?.[1] && weight[2]) {
    const value = numeric(weight[1]);
    return { value: weight[2].toLowerCase() === 'g' ? value / 1000 : value, unit: 'kg' };
  }

  const volume = VOLUME.exec(` ${text} `);
  if (volume?.[1] && volume[2]) {
    const value = numeric(volume[1]);
    return { value: volume[2].toLowerCase() === 'ml' ? value / 1000 : value, unit: 'l' };
  }

  const pieces = PIECES.exec(` ${text} `);
  if (pieces?.[1]) return { value: Number(pieces[1]), unit: 'piece' };
  return null;
}

export function calculateUnitPrice(price: number, packageText: string): { unitPrice: number; unitBasis: string } | null {
  const normalized = normalizePackageSize(packageText);
  if (!normalized || normalized.value <= 0) return null;
  const unitPrice = Math.round((price / normalized.value) * 10000) / 10000;
  const unitBasis = normalized.unit === 'piece' ? '1 piece' : `1${normalized.unit}`;
  return { unitPrice, unitBasis };
}

export function normalizedIdentityText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
