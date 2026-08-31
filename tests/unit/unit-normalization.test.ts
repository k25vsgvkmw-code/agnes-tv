import { describe, expect, it } from 'vitest';
import { calculateUnitPrice, normalizePackageSize } from '../../src/shopping/unit-normalization.js';

describe('shopping unit normalization', () => {
  it('normalizes grams and millilitres to base units', () => {
    expect(normalizePackageSize('Greek yogurt 500 g')).toEqual({ value: 0.5, unit: 'kg' });
    expect(normalizePackageSize('Juice 750 ml')).toEqual({ value: 0.75, unit: 'l' });
  });

  it('calculates comparable unit prices', () => {
    expect(calculateUnitPrice(2.5, '500 g')).toEqual({ unitPrice: 5, unitBasis: '1kg' });
  });
});
