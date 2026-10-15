import { describe, expect, it } from 'vitest';
import {
  evaluateSeasonSuitability,
  type SuitabilityWindow,
} from '../../src/travel/seasonality/seasonality.js';
import { getSeasonalTheme } from '../../src/travel/seasonality/seasonal-theme.js';

describe('Travel seasonality', () => {
  it('derives the visual season from the household timezone rather than UTC', () => {
    expect(getSeasonalTheme(new Date('2026-02-28T22:30:00Z'), 'Asia/Nicosia').season).toBe(
      'spring',
    );
    expect(getSeasonalTheme(new Date('2026-05-31T21:30:00Z'), 'Asia/Nicosia').season).toBe(
      'summer',
    );
    expect(getSeasonalTheme(new Date('2026-08-31T21:30:00Z'), 'Asia/Nicosia').season).toBe(
      'autumn',
    );
    expect(getSeasonalTheme(new Date('2026-11-30T22:30:00Z'), 'Asia/Nicosia').season).toBe(
      'winter',
    );
  });

  it('supports suitability windows that wrap across the end of the year', () => {
    const windows: readonly SuitabilityWindow[] = [
      {
        destinationId: 'phuket',
        startMonthDay: '11-01',
        endMonthDay: '02-28',
        score: 96,
        tags: ['beach', 'winter-sun'],
        reason: 'Dry season and comfortable beach weather',
        expectedLowC: 24,
        expectedHighC: 31,
      },
    ];

    const january = evaluateSeasonSuitability('phuket', '2027-01-15', windows);
    const july = evaluateSeasonSuitability('phuket', '2027-07-15', windows);

    expect(january.score).toBe(96);
    expect(january.label).toBe('Ideal season');
    expect(july.score).toBeLessThan(50);
  });

  it('returns the strongest matching suitability window', () => {
    const windows: readonly SuitabilityWindow[] = [
      {
        destinationId: 'vienna',
        startMonthDay: '09-01',
        endMonthDay: '10-31',
        score: 88,
        tags: ['city-break', 'autumn'],
        reason: 'Comfortable autumn city-break weather',
      },
      {
        destinationId: 'vienna',
        startMonthDay: '11-20',
        endMonthDay: '12-26',
        score: 97,
        tags: ['city-break', 'christmas-market'],
        reason: 'Christmas markets and festive atmosphere',
      },
    ];

    expect(evaluateSeasonSuitability('vienna', '2026-12-10', windows)).toMatchObject({
      score: 97,
      label: 'Ideal season',
      reason: 'Christmas markets and festive atmosphere',
    });
  });
});
