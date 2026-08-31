import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { createFixtureTravelPorts } from '../../src/travel/adapters/fixture-travel-ports.js';
import { TravelOpportunityEngine } from '../../src/travel/application/opportunity-engine.js';
import { exactDateIntent } from '../../src/travel/domain/date-intent.js';

function buildEngine(
  options: Parameters<typeof createFixtureTravelPorts>[0] = {},
): TravelOpportunityEngine {
  return new TravelOpportunityEngine({
    ...createFixtureTravelPorts(options),
    clock: new FixedClock(new Date('2026-09-01T09:00:00+03:00')),
    timeZone: 'Asia/Nicosia',
  });
}

describe('TravelOpportunityEngine', () => {
  it('builds an opportunity-first seasonal home model from Larnaca', async () => {
    const home = await buildEngine().home({ date: '2026-09-01', travellers: 2 });

    expect(home.origin).toBe('LCA');
    expect(home.currency).toBe('EUR');
    expect(home.theme.season).toBe('autumn');
    expect(home.dataQuality).toBe('fixture');
    expect(home.forYouNow.length).toBeGreaterThan(0);
    expect(home.threeDayEscapes.length).toBeGreaterThan(0);
    expect(home.next30Days.length).toBeGreaterThan(0);
    expect(home.nextMonth.length).toBeGreaterThan(0);
    expect(home.bestThisSeason.length).toBeGreaterThan(0);
    expect(home.bestThisYear.length).toBeGreaterThan(0);
    expect(home.holidays.length).toBeGreaterThan(0);

    const primary = [
      ...home.forYouNow,
      ...home.threeDayEscapes,
      ...home.next30Days,
      ...home.nextMonth,
      ...home.bestThisSeason,
      ...home.bestThisYear,
    ];
    expect(primary.every((item) => item.score >= 80)).toBe(true);
  });

  it('ranks a seasonally correct destination above a cheaper poor-season bargain', async () => {
    const results = await buildEngine().discover({
      intent: exactDateIntent('2027-02-12', '2027-02-15'),
      travellers: 2,
      origin: 'LCA',
      destinationIds: ['vienna', 'santorini'],
      includeBelowPrimaryThreshold: true,
    });

    const vienna = results.find((item) => item.destination.id === 'vienna');
    const santorini = results.find((item) => item.destination.id === 'santorini');

    expect(vienna).toBeDefined();
    expect(santorini).toBeDefined();
    expect((vienna?.priceQuote.perPersonAmount ?? Infinity)).toBeGreaterThan(
      santorini?.priceQuote.perPersonAmount ?? 0,
    );
    expect(vienna?.totalScore ?? 0).toBeGreaterThan(santorini?.totalScore ?? 100);
  });

  it('degrades missing accommodation and weather factors instead of failing the page', async () => {
    const engine = buildEngine({
      missingAccommodationFor: ['rome'],
      failWeatherFor: ['rome'],
    });

    const results = await engine.discover({
      intent: exactDateIntent('2026-10-17', '2026-10-20'),
      travellers: 2,
      destinationIds: ['rome'],
      includeBelowPrimaryThreshold: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.destination.id).toBe('rome');
    expect(results[0]?.priceQuote.accommodationAmount).toBeNull();
    expect(results[0]?.weatherSuitability).toBeNull();
    expect(results[0]?.confidence).toBeLessThan(1);
  });

  it('uses destination id as a stable tie-breaker when scores match', () => {
    const engine = buildEngine();
    const ranked = engine.rankForPresentation([
      { id: 'z-trip', totalScore: 90, destinationId: 'zurich' },
      { id: 'a-trip', totalScore: 90, destinationId: 'athens' },
      { id: 'b-trip', totalScore: 91, destinationId: 'berlin' },
    ]);

    expect(ranked.map((item) => item.destinationId)).toEqual(['berlin', 'athens', 'zurich']);
  });
});
