import { afterAll, expect, it } from 'vitest';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { FakeShoppingConnector } from '../../src/integrations/shopping/fake-shopping-connector.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresShoppingRepository } from '../../src/persistence/postgres-shopping-repository.js';
import { pool } from '../../src/persistence/postgres.js';
import { BasketService } from '../../src/shopping/basket-service.js';
import { CheckoutService } from '../../src/shopping/checkout-service.js';
import { ImportShoppingRecords } from '../../src/shopping/import-shopping-records.js';

const clock = new FixedClock(new Date('2026-08-31T13:00:00Z'));
const householdRepository = new PostgresHouseholdRepository(pool);
const shoppingRepository = new PostgresShoppingRepository(pool);

afterAll(async () => {
  await pool.end();
});

it('flows provider records through offers, AGNES basket, quote and retailer handoff', async () => {
  const household = createHousehold({
    name: 'AGNES Supermarket Test Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  const person = createPerson({
    householdId: household.id,
    displayName: 'Buyer',
    role: 'parent',
    locale: 'el-CY',
    timezone: 'Asia/Nicosia',
  });
  await householdRepository.saveHousehold(household);
  await householdRepository.savePerson(person);

  const records = [
    {
      kind: 'listing' as const,
      retailerSlug: 'alphamega-cy' as const,
      externalId: 'e2e-milk',
      title: 'E2E Fresh Milk 1 L',
      category: 'milk',
      gtin: '5290000000198',
      availability: 'available' as const,
      observedAt: '2026-08-31T12:50:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/el', acquisition: 'public_web' as const },
    },
    {
      kind: 'price' as const,
      retailerSlug: 'alphamega-cy' as const,
      externalId: 'e2e-milk',
      price: 1.39,
      referencePrice: 1.79,
      currency: 'EUR' as const,
      observedAt: '2026-08-31T12:50:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/el', acquisition: 'public_web' as const },
    },
    {
      kind: 'offer' as const,
      retailerSlug: 'alphamega-cy' as const,
      externalId: 'e2e-milk',
      providerOfferId: 'e2e-offer',
      offerType: 'price_cut' as const,
      headline: 'Fresh milk offer',
      currentPrice: 1.39,
      referencePrice: 1.79,
      discountPercent: 22.3,
      membershipRequired: false,
      endsAt: '2026-09-02T20:59:59.000Z',
      observedAt: '2026-08-31T12:50:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/el', acquisition: 'public_web' as const },
    },
  ];
  const connector = new FakeShoppingConnector(
    'shopping-alphamega-cy',
    records,
    'https://www.alphamega.com.cy/el',
  );
  await connector.connect();
  const sync = await connector.sync();
  const importer = new ImportShoppingRecords(shoppingRepository, clock);
  expect(await importer.execute(connector.id, sync.records)).toMatchObject({ accepted: 3, rejected: 0 });

  const product = await shoppingRepository.findProductByGtin('5290000000198');
  expect(product).not.toBeNull();
  const basketService = new BasketService(shoppingRepository, clock);
  const basket = await basketService.createBasket({
    householdId: household.id,
    createdByPersonId: person.id,
  });
  await basketService.addItem(basket.id, { productId: product!.id, quantity: 2 });
  const quote = await basketService.quoteBasket(basket.id);
  expect(quote.strategy).toBe('single_retailer');
  expect(quote.totalEstimate).toBe(2.78);

  const checkoutService = new CheckoutService(
    shoppingRepository,
    new Map([['alphamega-cy' as const, connector]]),
    clock,
  );
  const checkout = await checkoutService.prepareCheckout(quote.id, person.id);
  expect(checkout.sessions).toHaveLength(1);
  expect(checkout.sessions[0]?.handoffUrl).toBe('https://www.alphamega.com.cy/el');
  expect(checkout.sessions[0]?.validatedAt).toEqual(new Date('2026-08-31T13:00:00Z'));
});
