import type { ExternalReference } from '../../calendar/calendar-event.js';
import { ValidationError } from '../../kernel/errors.js';
import { SystemClock, type Clock } from '../../kernel/clock.js';
import { newExternalReferenceId } from '../../kernel/ids.js';
import type { ExternalCalendarRecord } from './external-calendar-record.js';

export interface NormalizedCalendarEventData {
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly externalReference: ExternalReference;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`external calendar ${field} is required`);
  }
  return normalized;
}

function parseDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`external calendar ${field} is invalid`);
  }
  return parsed;
}

export function normalizeCalendarRecord(
  record: ExternalCalendarRecord,
  clock: Clock = new SystemClock(),
): NormalizedCalendarEventData {
  const startsAt = parseDate(record.startsAt, 'startsAt');
  const endsAt = parseDate(record.endsAt, 'endsAt');

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('external calendar endsAt must be after startsAt');
  }

  return {
    title: requireText(record.title, 'title'),
    description: record.description?.trim() || null,
    startsAt,
    endsAt,
    timezone: requireText(record.timezone, 'timezone'),
    externalReference: {
      id: newExternalReferenceId(),
      provider: requireText(record.provider, 'provider'),
      externalId: requireText(record.externalId, 'externalId'),
      externalVersion: record.version?.trim() || null,
      etag: record.etag?.trim() || null,
      syncToken: record.syncToken?.trim() || null,
      lastSyncedAt: clock.now(),
      authoritative: true,
    },
  };
}
