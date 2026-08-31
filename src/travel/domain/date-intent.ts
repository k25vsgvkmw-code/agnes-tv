import { ValidationError } from '../../kernel/errors.js';

export type TravelDateIntent =
  | ExactDateIntent
  | PlusMinusDateIntent
  | CalendarMonthIntent
  | HorizonIntent
  | DurationHorizonIntent
  | HolidayDateIntent
  | AnyDatesIntent;

export interface ExactDateIntent {
  readonly kind: 'exact';
  readonly startsOn: string;
  readonly endsOn: string;
}

export interface PlusMinusDateIntent {
  readonly kind: 'plus_minus';
  readonly startsOn: string;
  readonly endsOn: string;
  readonly flexibilityDays: number;
}

export interface CalendarMonthIntent {
  readonly kind: 'calendar_month';
  readonly year: number;
  readonly month: number;
  readonly minNights: number;
  readonly maxNights: number;
}

export interface HorizonIntent {
  readonly kind: 'horizon';
  readonly startsOn: string;
  readonly endsOn: string;
  readonly nights: number;
}

export interface DurationHorizonIntent {
  readonly kind: 'duration_horizon';
  readonly startsOn: string;
  readonly endsOn: string;
  readonly minNights: number;
  readonly maxNights: number;
}

export interface HolidayDateIntent {
  readonly kind: 'holiday';
  readonly holidayId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly minNights: number;
  readonly maxNights: number;
}

export interface AnyDatesIntent {
  readonly kind: 'any_dates';
  readonly startsOn: string;
  readonly endsOn: string;
  readonly minNights: number;
  readonly maxNights: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalendarDate(value: string): Date {
  if (!ISO_DATE.test(value)) {
    throw new ValidationError(`invalid calendar date: ${value}`);
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError(`invalid calendar date: ${value}`);
  }
  return date;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

export function compareCalendarDates(left: string, right: string): number {
  return parseCalendarDate(left).getTime() - parseCalendarDate(right).getTime();
}

export function nightsBetween(startsOn: string, endsOn: string): number {
  return Math.round(
    (parseCalendarDate(endsOn).getTime() - parseCalendarDate(startsOn).getTime()) / 86_400_000,
  );
}

function validateRange(startsOn: string, endsOn: string): void {
  parseCalendarDate(startsOn);
  parseCalendarDate(endsOn);
  if (compareCalendarDates(startsOn, endsOn) >= 0) {
    throw new ValidationError('travel end date must be after start date');
  }
}

function validateNights(minNights: number, maxNights: number): void {
  if (!Number.isInteger(minNights) || !Number.isInteger(maxNights) || minNights < 1) {
    throw new ValidationError('travel nights must be positive integers');
  }
  if (minNights > maxNights) {
    throw new ValidationError('minimum nights cannot exceed maximum nights');
  }
}

export function exactDateIntent(startsOn: string, endsOn: string): ExactDateIntent {
  validateRange(startsOn, endsOn);
  return { kind: 'exact', startsOn, endsOn };
}

export function plusMinusDateIntent(
  startsOn: string,
  endsOn: string,
  flexibilityDays: number,
): PlusMinusDateIntent {
  validateRange(startsOn, endsOn);
  if (!Number.isInteger(flexibilityDays) || flexibilityDays < 0 || flexibilityDays > 366) {
    throw new ValidationError('flexibility days must be an integer from 0 to 366');
  }
  return { kind: 'plus_minus', startsOn, endsOn, flexibilityDays };
}

export function calendarMonthIntent(
  year: number,
  month: number,
  minNights = 3,
  maxNights = 4,
): CalendarMonthIntent {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new ValidationError('invalid travel year');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ValidationError('invalid travel month');
  }
  validateNights(minNights, maxNights);
  return { kind: 'calendar_month', year, month, minNights, maxNights };
}

export function horizonIntent(
  startsOn: string,
  endsOn: string,
  nights: number,
): HorizonIntent {
  validateRange(startsOn, endsOn);
  validateNights(nights, nights);
  return { kind: 'horizon', startsOn, endsOn, nights };
}

export function durationHorizonIntent(
  startsOn: string,
  endsOn: string,
  minNights: number,
  maxNights: number,
): DurationHorizonIntent {
  validateRange(startsOn, endsOn);
  validateNights(minNights, maxNights);
  return { kind: 'duration_horizon', startsOn, endsOn, minNights, maxNights };
}

export function holidayIntent(
  holidayId: string,
  startsOn: string,
  endsOn: string,
  minNights = 3,
  maxNights = 4,
): HolidayDateIntent {
  validateRange(startsOn, endsOn);
  validateNights(minNights, maxNights);
  const normalized = holidayId.trim();
  if (!normalized) throw new ValidationError('holiday id is required');
  return { kind: 'holiday', holidayId: normalized, startsOn, endsOn, minNights, maxNights };
}

export function anyDatesIntent(
  startsOn: string,
  endsOn: string,
  minNights: number,
  maxNights: number,
): AnyDatesIntent {
  validateRange(startsOn, endsOn);
  validateNights(minNights, maxNights);
  return { kind: 'any_dates', startsOn, endsOn, minNights, maxNights };
}
