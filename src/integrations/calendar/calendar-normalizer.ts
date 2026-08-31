import { assertCalendarRange } from '../../calendar/calendar-event.js';
import { SystemClock, type Clock } from '../../kernel/clock.js';
import { ValidationError } from '../../kernel/errors.js';
import type { ExternalCalendarRecord, ExternalReference } from './external-calendar-record.js';

export interface NormalizedCalendarRecord {
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly externalReference: ExternalReference;
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return normalized;
}

function validTimezone(value: string): string {
  const timezone = required(value, 'timezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
  } catch (error) {
    throw new ValidationError('timezone must be a valid IANA timezone', { cause: error });
  }
  return timezone;
}

export function normalizeCalendarRecord(
  record: ExternalCalendarRecord,
  clock: Clock = new SystemClock(),
): NormalizedCalendarRecord {
  const startsAt = new Date(record.startsAt);
  const endsAt = new Date(record.endsAt);
  assertCalendarRange(startsAt, endsAt);

  return Object.freeze({
    title: required(record.title, 'title'),
    description: record.description?.trim() || null,
    startsAt,
    endsAt,
    timezone: validTimezone(record.timezone),
    externalReference: Object.freeze({
      provider: required(record.provider, 'provider'),
      externalId: required(record.externalId, 'externalId'),
      externalVersion: record.version ?? null,
      etag: record.etag ?? null,
      syncToken: record.syncToken ?? null,
      lastSyncedAt: clock.now(),
      authoritative: true,
    }),
  });
}
