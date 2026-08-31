import { describe, expect, it } from 'vitest';

import { parseTravelDateIntent } from '../../src/travel/domain/date-intent.js';
import { makeTravelWindow } from '../../src/travel/domain/travel-types.js';

describe('travel domain', () => {
  it('derives nights from calendar dates without timezone drift', () => {
    expect(makeTravelWindow('2026-10-24', '2026-10-27', 'exact')).toMatchObject({
      startsOn: '2026-10-24',
      endsOn: '2026-10-27',
      nights: 3,
      flexibilityDays: 0,
      sourceIntent: 'exact',
    });
  });

  it('accepts any-dates intent with a bounded horizon and night range', () => {
    expect(
      parseTravelDateIntent({
        kind: 'any-dates',
        horizonDays: 180,
        minNights: 3,
        maxNights: 4,
      }),
    ).toEqual({
      kind: 'any-dates',
      horizonDays: 180,
      minNights: 3,
      maxNights: 4,
    });
  });

  it('rejects inverted night ranges', () => {
    expect(() =>
      parseTravelDateIntent({
        kind: 'any-dates',
        horizonDays: 180,
        minNights: 5,
        maxNights: 3,
      }),
    ).toThrow();
  });
});
