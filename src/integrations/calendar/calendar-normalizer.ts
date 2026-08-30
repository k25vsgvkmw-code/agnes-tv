import {
  createCalendarEvent,
  createExternalReference,
  type CalendarEvent,
} from '../../calendar/calendar-event.js';
import { ValidationError } from '../../kernel/errors.js';
import type { HouseholdId } from '../../kernel/ids.js';
import type { ExternalCalendarRecord } from './external-calendar-record.js';

export interface CalendarNormalizationContext {
  readonly householdId: HouseholdId;
  readonly lastSyncedAt: Date;
}

function parseProviderDate(field: 'startsAt' | 'endsAt', value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} must be a valid provider date`, { field, value });
  }
  return parsed;
}

export function normalizeCalendarRecord(
  record: ExternalCalendarRecord,
  context: CalendarNormalizationContext,
): CalendarEvent {
  const externalReference = createExternalReference({
    provider: record.provider,
    externalId: record.externalId,
    lastSyncedAt: context.lastSyncedAt,
    authoritative: true,
    ...(record.version === undefined ? {} : { externalVersion: record.version }),
    ...(record.etag === undefined ? {} : { etag: record.etag }),
    ...(record.syncToken === undefined ? {} : { syncToken: record.syncToken }),
  });

  return createCalendarEvent({
    householdId: context.householdId,
    title: record.title,
    startsAt: parseProviderDate('startsAt', record.startsAt),
    endsAt: parseProviderDate('endsAt', record.endsAt),
    timezone: record.timezone,
    externalReference,
  });
}
