import { describe, expect, it } from 'vitest';
import { AlphaMegaConnector } from '../../src/integrations/shopping/alphamega-connector.js';
import { StaticSourceFetcher } from '../../src/integrations/shopping/source-fetcher.js';

const alphaUrl = 'https://www.alphamega.com.cy/el';
const fixture = `
<html><body>
<script data-agnes-shopping type="application/json">
[
  {
    "externalId":"858031",
    "title":"Greek Yogurt 500 g",
    "brand":"Test Brand",
    "packageText":"500 g",
    "price":2.49,
    "referencePrice":3.29,
    "providerOfferId":"offer-858031",
    "offerHeadline":"Weekly offer",
    "endsAt":"2026-09-02T20:59:59.000Z"
  }
]
</script>
</body></html>`;

describe('shopping connectors', () => {
  it('normalizes one public product into listing, price and offer records', async () => {
    const connector = new AlphaMegaConnector(new StaticSourceFetcher({ [alphaUrl]: fixture }));
    await connector.connect();
    const result = await connector.sync();

    expect(result.records.map((record) => record.kind)).toEqual(['listing', 'price', 'offer']);
    expect(result.records.find((record) => record.kind === 'price')).toMatchObject({
      retailerSlug: 'alphamega-cy',
      price: 2.49,
      unitPrice: 4.98,
      unitBasis: '1kg',
    });
    expect((await connector.health()).state).toBe('connected');
  });

  it('degrades cleanly when the public source has no supported product records', async () => {
    const connector = new AlphaMegaConnector(new StaticSourceFetcher({ [alphaUrl]: '<html></html>' }));
    await connector.connect();
    expect((await connector.sync()).records).toEqual([]);
    expect((await connector.health()).state).toBe('degraded');
  });
});
