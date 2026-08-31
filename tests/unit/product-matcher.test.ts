import { describe, expect, it } from 'vitest';
import { matchProduct } from '../../src/shopping/product-matcher.js';
import type { Product } from '../../src/shopping/shopping-types.js';

const products: readonly Product[] = [
  {
    id: 'milk',
    canonicalName: 'Lanitis Fresh Milk 1 L',
    brand: 'Lanitis',
    category: 'milk',
    gtin: '5290000000001',
    sizeValue: 1,
    sizeUnit: 'l',
    status: 'active',
  },
  {
    id: 'yogurt',
    canonicalName: 'Greek Yogurt 500 g',
    category: 'yogurt',
    sizeValue: 500,
    sizeUnit: 'g',
    status: 'active',
  },
];

describe('product matcher', () => {
  it('uses GTIN for exact identity', () => {
    const result = matchProduct({ title: 'Different provider title', gtin: '5290000000001' }, products);
    expect(result).toMatchObject({ method: 'gtin', confidence: 1, exact: true });
  });

  it('labels text similarity as an alternative rather than exact when identity is uncertain', () => {
    const result = matchProduct({ title: 'Greek Yogurt Traditional 500 g', packageText: '500 g' }, products);
    expect(result?.method).toBe('fuzzy_alternative');
    expect(result?.exact).toBe(false);
  });
});
