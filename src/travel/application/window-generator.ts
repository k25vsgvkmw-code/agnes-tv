import {
  addCalendarDays,
  compareCalendarDates,
  formatCalendarDate,
  nightsBetween,
  parseCalendarDate,
  type TravelDateIntent,
} from '../domain/date-intent.js';
import type { TravelWindow } from '../domain/types.js';

const MAX_START_DATES = 366;

function windowFor(
  startsOn: string,
  endsOn: string,
  sourceIntent: string,
  flexibilityDays = 0,
): TravelWindow {
  return {
    startsOn,
    endsOn,
    nights: nightsBetween(startsOn, endsOn),
    flexibilityDays,
    sourceIntent,
  };
}

function durationWindows(
  startsOn: string,
  endsOn: string,
  minNights: number,
  maxNights: number,
  sourceIntent: string,
): readonly TravelWindow[] {
  const values: TravelWindow[] = [];
  let cursor = startsOn;
  let starts = 0;
  while (compareCalendarDates(cursor, endsOn) < 0 && starts < MAX_START_DATES) {
    for (let nights = minNights; nights <= maxNights; nights += 1) {
      const candidateEnd = addCalendarDays(cursor, nights);
      if (compareCalendarDates(candidateEnd, endsOn) <= 0) {
        values.push(windowFor(cursor, candidateEnd, sourceIntent));
      }
    }
    cursor = addCalendarDays(cursor, 1);
    starts += 1;
  }
  return deduplicate(values);
}

function deduplicate(windows: readonly TravelWindow[]): readonly TravelWindow[] {
  const seen = new Set<string>();
  const unique: TravelWindow[] = [];
  for (const window of windows) {
    const key = `${window.startsOn}:${window.endsOn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(window);
  }
  return unique;
}

function monthBounds(year: number, month: number): { startsOn: string; endsOn: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const afterMonth = new Date(Date.UTC(year, month, 1));
  return {
    startsOn: formatCalendarDate(start),
    endsOn: formatCalendarDate(afterMonth),
  };
}

export function generateTravelWindows(intent: TravelDateIntent): readonly TravelWindow[] {
  switch (intent.kind) {
    case 'exact':
      return [windowFor(intent.startsOn, intent.endsOn, intent.kind)];
    case 'plus_minus': {
      const nights = nightsBetween(intent.startsOn, intent.endsOn);
      const values: TravelWindow[] = [];
      for (let offset = -intent.flexibilityDays; offset <= intent.flexibilityDays; offset += 1) {
        const startsOn = addCalendarDays(intent.startsOn, offset);
        values.push(
          windowFor(
            startsOn,
            addCalendarDays(startsOn, nights),
            intent.kind,
            intent.flexibilityDays,
          ),
        );
      }
      return values;
    }
    case 'calendar_month': {
      const bounds = monthBounds(intent.year, intent.month);
      return durationWindows(
        bounds.startsOn,
        bounds.endsOn,
        intent.minNights,
        intent.maxNights,
        intent.kind,
      );
    }
    case 'horizon':
      return durationWindows(intent.startsOn, intent.endsOn, intent.nights, intent.nights, intent.kind);
    case 'duration_horizon':
    case 'holiday':
    case 'any_dates':
      return durationWindows(
        intent.startsOn,
        intent.endsOn,
        intent.minNights,
        intent.maxNights,
        intent.kind,
      );
  }
}

export interface ThreeDayEscapeWindow extends TravelWindow {
  readonly departureDay: 'friday' | 'saturday';
}

export function generateThreeDayEscapeWindows(
  startsOn: string,
  endsOn: string,
): readonly ThreeDayEscapeWindow[] {
  parseCalendarDate(startsOn);
  parseCalendarDate(endsOn);
  const values: ThreeDayEscapeWindow[] = [];
  let cursor = startsOn;
  let starts = 0;
  while (compareCalendarDates(cursor, endsOn) < 0 && starts < MAX_START_DATES) {
    const weekday = parseCalendarDate(cursor).getUTCDay();
    if (weekday === 5 || weekday === 6) {
      const candidateEnd = addCalendarDays(cursor, 3);
      if (compareCalendarDates(candidateEnd, endsOn) <= 0) {
        values.push({
          startsOn: cursor,
          endsOn: candidateEnd,
          nights: 3,
          flexibilityDays: 0,
          sourceIntent: 'three_day_escape',
          departureDay: weekday === 5 ? 'friday' : 'saturday',
        });
      }
    }
    cursor = addCalendarDays(cursor, 1);
    starts += 1;
  }
  return values;
}
