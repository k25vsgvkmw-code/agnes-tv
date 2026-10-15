import { describe, expect, it } from 'vitest';
import { optimizeBasket, type PricedBasketItem } from '../../src/shopping/basket-optimizer.js';

function items(alphaSecondPrice: number): readonly PricedBasketItem[] {
  return [
    {
      basketItemId: 'one',
      productId: 'p1',
      quantity: 1,
      options: [
        { retailerId: 'a', retailerSlug: 'alphamega-cy', retailerListingId: 'a1', unitPrice: 5 },
        { retailerId: 'l', retailerSlug: 'lidl-cy', retailerListingId: 'l1', unitPrice: 3 },
      ],
    },
    {
      basketItemId: 'two',
      productId: 'p2',
      quantity: 1,
      options: [
        { retailerId: 'a', retailerSlug: 'alphamega-cy', retailerListingId: 'a2', unitPrice: alphaSecondPrice },
        { retailerId: 'l', retailerSlug: 'lidl-cy', retailerListingId: 'l2', unitPrice: 7 },
      ],
    },
  ];
}

describe('basket optimizer', () => {
  it('keeps one retailer when split saving is below the household threshold', () => {
    const result = optimizeBasket(items(5), {
      minimumSplitSavingEuro: 3,
      maximumRetailerCount: 2,
      frictionPenaltyEuro: 0,
    });
    expect(result.strategy).toBe('single_retailer');
  });

  it('uses two retailers when the net saving is material', () => {
    const result = optimizeBasket(items(9), {
      minimumSplitSavingEuro: 3,
      maximumRetailerCount: 2,
      frictionPenaltyEuro: 0,
    });
    expect(result.strategy).toBe('split_retailer');
    expect(result.estimatedSaving).toBeGreaterThanOrEqual(3);
  });
});
