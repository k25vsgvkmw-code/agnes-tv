import { describe, expect, it } from 'vitest';
import { getJourneyById, JOURNEYS } from '../docs/travel/journeys-data.js';
import {
  classifyJourneySeason,
  getSeasonalCollections,
  rankJourneysForMonth,
} from '../docs/travel/seasonality.js';

describe('journey seasonality', () => {
  it('classifies current and upcoming months including year wrap', () => {
    const summer = getJourneyById('greek-islands-limassol');
    expect(classifyJourneySeason(summer, 7)).toBe('in-season');
    expect(classifyJourneySeason(summer, 3)).toBe('coming-next');
    const january = {
      title: 'Jan',
      bestMonths: [1],
      shoulderMonths: [],
      eventMonths: [],
      avoidMonths: [],
      yearRound: false,
    };
    expect(classifyJourneySeason(january, 12)).toBe('coming-next');
    expect(() => classifyJourneySeason(january, 13)).toThrow(RangeError);
  });

  it('orders seasonal journeys deterministically', () => {
    const ranked = rankJourneysForMonth(JOURNEYS, 10);
    const classes = ranked.map((journey) => classifyJourneySeason(journey, 10));
    const order = {
      'in-season': 0,
      'coming-next': 1,
      'year-round': 2,
      'off-season': 3,
    };
    expect(
      classes.every((value, index) => index === 0 || order[value] >= order[classes[index - 1]]),
    ).toBe(true);
    expect(getSeasonalCollections(JOURNEYS, 10).rightNow.length).toBeGreaterThan(0);
  });
});
