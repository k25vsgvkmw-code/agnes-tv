import { describe, expect, it } from 'vitest';
import { createProviderGateway } from '../docs/travel/provider-gateway.js';

describe('AGNES World V2 provider gateway', () => {
  it('returns verified live results with provider provenance', async () => {
    const gateway = createProviderGateway({
      demo: {
        searchFlights: async () => [{ id: 'flight-1', title: 'Larnaca to Tokyo' }],
      },
    });
    const result = await gateway.searchLiveOptions('flights', { from: 'LCA', to: 'TYO' });
    expect(result.status).toBe('ok');
    expect(result.live).toBe(true);
    expect(result.provider).toBe('demo');
    expect(result.results).toHaveLength(1);
  });

  it('returns editorial fallback when no adapter supports the request', async () => {
    const gateway = createProviderGateway({});
    const result = await gateway.searchLiveOptions('cruises', { from: 'limassol' });
    expect(result).toMatchObject({ status: 'fallback', live: false, provider: null, results: [] });
  });

  it('fails closed when a provider throws', async () => {
    const gateway = createProviderGateway({
      broken: { searchRail: async () => { throw new Error('provider down'); } },
    });
    const result = await gateway.searchLiveOptions('rail', { from: 'zurich' });
    expect(result.status).toBe('fallback');
    expect(result.live).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toContain('provider down');
  });
});
