import { describe, expect, it } from 'vitest';
import {
  offerRecordSchema,
  priceObservationRecordSchema,
  shoppingRecordSchema,
} from '../../src/shopping/shopping-schemas.js';

describe('shopping schemas', () => {
  it('accepts a EUR price observation with provenance and rejects negative price', () => {
    const valid = priceObservationRecordSchema.parse({
      kind: 'price',
      retailerSlug: 'alphamega-cy',
      externalId: '858031',
      price: 3.99,
      currency: 'EUR',
      referencePrice: 4.99,
      unitPrice: 6.65,
      unitBasis: '1kg',
      observedAt: '2026-08-31T13:00:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
    });

    expect(valid.price).toBe(3.99);
    expect(() => priceObservationRecordSchema.parse({ ...valid, price: -1 })).toThrow();
  });

  it('validates offer boundaries through the record union', () => {
    const offer = shoppingRecordSchema.parse({
      kind: 'offer',
      retailerSlug: 'lidl-cy',
      externalId: 'offer-1',
      providerOfferId: 'week-36-offer-1',
      headline: 'Greek yogurt',
      currentPrice: 2.49,
      referencePrice: 3.29,
      endsAt: '2026-09-02T20:59:59.000Z',
      membershipRequired: false,
      observedAt: '2026-08-31T13:00:00.000Z',
      provenance: { sourceUrl: 'https://www.lidl.com.cy/el-CY/', acquisition: 'public_web' },
    });

    expect(offerRecordSchema.parse(offer).retailerSlug).toBe('lidl-cy');
  });
});
