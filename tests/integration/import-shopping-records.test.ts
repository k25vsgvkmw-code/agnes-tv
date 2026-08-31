import { afterAll, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { PostgresShoppingRepository } from '../../src/persistence/postgres-shopping-repository.js';
import { pool } from '../../src/persistence/postgres.js';
import { ImportShoppingRecords } from '../../src/shopping/import-shopping-records.js';

const repository = new PostgresShoppingRepository(pool);
const importer = new ImportShoppingRecords(repository, new FixedClock(new Date('2026-08-31T13:00:00Z')));

afterAll(async () => {
  await pool.end();
});

it('imports valid records while isolating a malformed record', async () => {
  const records: readonly unknown[] = [
    {
      kind: 'listing',
      retailerSlug: 'alphamega-cy',
      externalId: 'import-milk-1',
      title: 'Import Milk 1 L',
      category: 'milk',
      gtin: '5290000000099',
      availability: 'available',
      observedAt: '2026-08-31T12:00:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/el', acquisition: 'public_web' },
    },
    {
      kind: 'price',
      retailerSlug: 'alphamega-cy',
      externalId: 'import-milk-1',
      price: 1.59,
      currency: 'EUR',
      observedAt: '2026-08-31T12:00:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/el', acquisition: 'public_web' },
    },
    { kind: 'price', retailerSlug: 'alphamega-cy', externalId: 'bad', price: -1 },
  ];

  const first = await importer.execute('shopping-alphamega-cy', records);
  const second = await importer.execute('shopping-alphamega-cy', records.slice(0, 2));
  expect(first).toMatchObject({ accepted: 2, rejected: 1, listings: 1, prices: 1 });
  expect(second).toMatchObject({ accepted: 2, rejected: 0 });

  const product = await repository.findProductByGtin('5290000000099');
  expect(product).not.toBeNull();
  expect(await repository.getPriceHistory(product!.id)).toHaveLength(1);
});
