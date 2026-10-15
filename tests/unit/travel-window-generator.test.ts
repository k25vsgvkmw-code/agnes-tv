import { describe, expect, it } from 'vitest';
import {
  anyDatesIntent,
  durationHorizonIntent,
  exactDateIntent,
  plusMinusDateIntent,
} from '../../src/travel/domain/date-intent.js';
import {
  generateThreeDayEscapeWindows,
  generateTravelWindows,
} from '../../src/travel/application/window-generator.js';

describe('Travel date intents and window generation', () => {
  it('creates and validates exact date intent', () => {
    expect(exactDateIntent('2026-10-17', '2026-10-20')).toEqual({
      kind: 'exact',
      startsOn: '2026-10-17',
      endsOn: '2026-10-20',
    });
    expect(() => exactDateIntent('2026-10-20', '2026-10-17')).toThrow();
    expect(() => exactDateIntent('not-a-date', '2026-10-20')).toThrow();
  });

  it('generates nearby alternatives for plus/minus days using calendar dates', () => {
    const windows = generateTravelWindows(
      plusMinusDateIntent('2026-10-17', '2026-10-20', 3),
    );

    expect(windows.map((window) => window.startsOn)).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ]);
    expect(windows.every((window) => window.nights === 3)).toBe(true);
  });

  it('generates both 3-night and 4-night choices inside a flexible horizon', () => {
    const windows = generateTravelWindows(
      durationHorizonIntent('2026-10-01', '2026-10-08', 3, 4),
    );

    expect(windows.some((window) => window.nights === 3)).toBe(true);
    expect(windows.some((window) => window.nights === 4)).toBe(true);
    expect(windows.every((window) => window.startsOn >= '2026-10-01')).toBe(true);
    expect(windows.every((window) => window.endsOn <= '2026-10-08')).toBe(true);
  });

  it('supports Any Dates without hard-coding UI button semantics into the domain', () => {
    const intent = anyDatesIntent('2026-10-01', '2026-11-01', 3, 4);
    const windows = generateTravelWindows(intent);

    expect(intent.kind).toBe('any_dates');
    expect(windows.length).toBeGreaterThan(20);
    expect(windows.every((window) => window.sourceIntent === 'any_dates')).toBe(true);
  });

  it('generates smart 3-night Friday-Monday and Saturday-Tuesday escape windows', () => {
    const windows = generateThreeDayEscapeWindows('2026-09-01', '2026-09-30');

    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((window) => window.nights === 3)).toBe(true);
    expect(windows.every((window) => ['friday', 'saturday'].includes(window.departureDay))).toBe(
      true,
    );
  });
});
