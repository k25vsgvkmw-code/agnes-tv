import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { rankOffers } from '../../src/shopping/offer-ranking.js';
import type { Offer } from '../../src/shopping/shopping-types.js';

const clock = new FixedClock(new Date('2026-08-31T12:00:00Z'));

function offer(id: string, currentPrice: number, referencePrice: number, endsAt: string): Offer {
  return {
    id,
    retailerListingId: `listing-${id}`,
    offerType: 'price_cut',
    headline: id,
    currentPrice,
    referencePrice,
    discountPercent: Math.round(((referencePrice - currentPrice) / referencePrice) * 100),
    endsAt: new Date(endsAt),
    membershipRequired: false,
    observedAt: new Date('2026-08-31T10:00:00Z'),
    status: 'current',
    provenance: { sourceUrl: 'https://example.com', acquisition: 'public_web' },
  };
}

describe('offer ranking', () => {
  it('prioritizes material household-relevant savings and expiry urgency', () => {
    const ranked = rankOffers(
      [
        { offer: offer('small', 2.9, 3, '2026-09-10T12:00:00Z') },
        {
          offer: offer('useful', 4, 8, '2026-09-01T12:00:00Z'),
          onHouseholdList: true,
        },
      ],
      clock,
    );

    expect(ranked[0]?.offer.id).toBe('useful');
    expect(ranked[0]?.reasonCodes).toContain('large_saving');
    expect(ranked[0]?.reasonCodes).toContain('expires_soon');
    expect(ranked[0]?.reasonCodes).toContain('on_household_list');
  });
});
