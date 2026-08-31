import { afterAll, expect, it } from 'vitest';
import { PostgresShoppingRepository } from '../../src/persistence/postgres-shopping-repository.js';
import { pool } from '../../src/persistence/postgres.js';

const repository = new PostgresShoppingRepository(pool);

afterAll(async () => {
  await pool.end();
});

it('upserts one retailer listing and preserves distinct price observations', async () => {
  const retailer = await repository.upsertRetailer({
    slug: 'alphamega-cy',
    displayName: 'AlphaMega',
    countryCode: 'CY',
    supportsCatalogue: true,
    supportsOffers: true,
    supportsBasketRevalidation: false,
    supportsCheckoutHandoff: true,
    supportsDirectCheckout: false,
    status: 'active',
  });
  const product = await repository.createProduct({
    canonicalName: 'Test Milk 1 L',
    category: 'milk',
    gtin: '5290000000001',
    status: 'active',
  });
  const first = await repository.upsertListing({
    productId: product.id,
    retailerId: retailer.id,
    externalId: 'milk-1',
    sourceName: 'alphamega',
    title: 'Test Milk 1 L',
    gtin: '5290000000001',
    availability: 'available',
    lastObservedAt: new Date('2026-08-31T10:00:00Z'),
  });
  const second = await repository.upsertListing({
    productId: product.id,
    retailerId: retailer.id,
    externalId: 'milk-1',
    sourceName: 'alphamega',
    title: 'Test Milk 1L',
    gtin: '5290000000001',
    availability: 'available',
    lastObservedAt: new Date('2026-08-31T11:00:00Z'),
  });
  expect(second.id).toBe(first.id);

  await repository.appendPriceObservation({
    retailerListingId: first.id,
    price: 1.49,
    currency: 'EUR',
    observedAt: new Date('2026-08-31T10:00:00Z'),
    provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
  });
  await repository.appendPriceObservation({
    retailerListingId: first.id,
    price: 1.39,
    currency: 'EUR',
    observedAt: new Date('2026-08-31T12:00:00Z'),
    provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
  });

  expect(await repository.getPriceHistory(product.id)).toHaveLength(2);
});
