import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { createFixtureTravelPorts } from '../../src/travel/adapters/fixture-travel-ports.js';
import { buildQuickView } from '../../src/travel/application/quick-view.js';
import { TravelOpportunityEngine } from '../../src/travel/application/opportunity-engine.js';

function engine(): TravelOpportunityEngine {
  return new TravelOpportunityEngine({
    ...createFixtureTravelPorts(),
    clock: new FixedClock(new Date('2026-09-01T09:00:00+03:00')),
    timeZone: 'Asia/Nicosia',
  });
}

describe('Travel Quick View', () => {
  it('shows the selected destination on nearby dates without leaving context', async () => {
    const result = await buildQuickView(engine(), {
      destinationId: 'rome',
      startsOn: '2026-10-17',
      endsOn: '2026-10-20',
      travellers: 2,
    });

    expect(result.selected.destination.id).toBe('rome');
    expect(result.sameDestinationDates.map((item) => item.offsetDays)).toEqual([-7, -3, 0, 3, 7]);
    expect(result.sameDestinationDates.find((item) => item.offsetDays === 0)?.selected).toBe(true);
    expect(result.sameDestinationDates.every((item) => item.opportunity.destination.id === 'rome')).toBe(
      true,
    );
  });

  it('shows other destinations for exactly the same dates ranked by the same engine', async () => {
    const result = await buildQuickView(engine(), {
      destinationId: 'rome',
      startsOn: '2026-10-17',
      endsOn: '2026-10-20',
      travellers: 2,
    });

    expect(result.sameDateDestinations.length).toBeGreaterThan(0);
    expect(result.sameDateDestinations.every((item) => item.destination.id !== 'rome')).toBe(true);
    expect(
      result.sameDateDestinations.every(
        (item, index, items) => index === 0 || (items[index - 1]?.totalScore ?? 0) >= item.totalScore,
      ),
    ).toBe(true);
    expect(result.explanation.length).toBeGreaterThan(20);
  });

  it('exposes flexible actions as canonical intents', async () => {
    const result = await buildQuickView(engine(), {
      destinationId: 'rome',
      startsOn: '2026-10-17',
      endsOn: '2026-10-20',
      travellers: 2,
    });

    expect(result.actions.map((action) => action.kind)).toEqual([
      'plus_minus',
      'any_dates',
      'calendar_month',
      'best_3_nights',
      'best_4_nights',
    ]);
  });
});
