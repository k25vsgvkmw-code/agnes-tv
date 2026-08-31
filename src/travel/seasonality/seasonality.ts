import { parseCalendarDate } from '../domain/date-intent.js';
import type { SeasonSuitability } from '../domain/types.js';

export interface SuitabilityWindow {
  readonly destinationId: string;
  readonly startMonthDay: string;
  readonly endMonthDay: string;
  readonly score: number;
  readonly tags: readonly string[];
  readonly reason: string;
  readonly expectedLowC?: number;
  readonly expectedHighC?: number;
}

const MONTH_DAY = /^\d{2}-\d{2}$/;

function monthDayForDate(value: string): string {
  const date = parseCalendarDate(value);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function validMonthDay(value: string): boolean {
  if (!MONTH_DAY.test(value)) return false;
  const [monthText, dayText] = value.split('-');
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(2024, month - 1, day));
  return probe.getUTCMonth() + 1 === month && probe.getUTCDate() === day;
}

function containsMonthDay(value: string, start: string, end: string): boolean {
  if (!validMonthDay(start) || !validMonthDay(end)) return false;
  if (start <= end) return value >= start && value <= end;
  return value >= start || value <= end;
}

function labelForScore(
  score: number,
): SeasonSuitability['label'] {
  if (score >= 90) return 'Ideal season';
  if (score >= 80) return 'Very good period';
  if (score >= 65) return 'Shoulder-season value';
  return 'Off-season';
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function evaluateSeasonSuitability(
  destinationId: string,
  startsOn: string,
  windows: readonly SuitabilityWindow[],
): SeasonSuitability {
  const monthDay = monthDayForDate(startsOn);
  const matches = windows
    .filter(
      (window) =>
        window.destinationId === destinationId &&
        containsMonthDay(monthDay, window.startMonthDay, window.endMonthDay),
    )
    .sort((left, right) => right.score - left.score);
  const best = matches[0];

  if (!best) {
    return {
      score: 35,
      label: 'Off-season',
      reason: 'Outside the destination’s preferred travel windows',
      tags: [],
    };
  }

  const score = clampScore(best.score);
  const base = {
    score,
    label: labelForScore(score),
    reason: best.reason,
    tags: best.tags,
  } as const;

  if (best.expectedLowC !== undefined && best.expectedHighC !== undefined) {
    return {
      ...base,
      expectedLowC: best.expectedLowC,
      expectedHighC: best.expectedHighC,
    };
  }
  return base;
}
