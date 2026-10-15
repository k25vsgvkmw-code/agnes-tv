import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { createFixtureTravelPorts } from '../../src/travel/adapters/fixture-travel-ports.js';
import { TravelOpportunityEngine } from '../../src/travel/application/opportunity-engine.js';
import { registerTravelRoutes } from '../../src/transport/travel-routes.js';

function buildTravelEngine(): TravelOpportunityEngine {
  return new TravelOpportunityEngine({
    ...createFixtureTravelPorts(),
    clock: new FixedClock(new Date('2026-09-01T09:00:00+03:00')),
    timeZone: 'Asia/Nicosia',
  });
}

describe('Travel routes', () => {
  it('returns a seasonal opportunity-first Travel home contract', async () => {
    const app = Fastify();
    await registerTravelRoutes(app, buildTravelEngine());

    const response = await app.inject({
      method: 'GET',
      url: '/travel/home?date=2026-09-01&travellers=2',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      origin: 'LCA',
      currency: 'EUR',
      dataQuality: 'fixture',
      theme: { season: 'autumn' },
    });
    expect(response.json().forYouNow.length).toBeGreaterThan(0);

    await app.close();
  });

  it('returns Quick View alternatives for a selected opportunity', async () => {
    const app = Fastify();
    await registerTravelRoutes(app, buildTravelEngine());

    const response = await app.inject({
      method: 'GET',
      url: '/travel/quick-view?destinationId=rome&startsOn=2026-10-17&endsOn=2026-10-20&travellers=2',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().selected.destination.id).toBe('rome');
    expect(response.json().sameDestinationDates).toHaveLength(5);
    expect(response.json().sameDateDestinations.length).toBeGreaterThan(0);
    expect(response.json().dataQuality).toBe('fixture');

    await app.close();
  });

  it('rejects invalid traveller counts instead of silently correcting them', async () => {
    const app = Fastify();
    await registerTravelRoutes(app, buildTravelEngine());

    const response = await app.inject({
      method: 'GET',
      url: '/travel/home?date=2026-09-01&travellers=0',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
