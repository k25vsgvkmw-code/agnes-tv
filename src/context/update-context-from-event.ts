import type { CalendarEvent } from '../calendar/calendar-event.js';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { ContextStore } from './context-store.js';
import { emptyHouseholdContext } from './household-context.js';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readCalendarEvent(event: AgnesEvent): CalendarEvent | null {
  if (event.type !== 'calendar.event.created.v1') {
    return null;
  }

  const payload = asRecord(event.payload);
  const raw = asRecord(payload?.calendarEvent);
  const externalReference = asRecord(raw?.externalReference);
  if (raw === null || externalReference === null) {
    return null;
  }

  const startsAt = asDate(raw.startsAt);
  const endsAt = asDate(raw.endsAt);
  const lastSyncedAt = asDate(externalReference.lastSyncedAt);
  if (startsAt === null || endsAt === null || lastSyncedAt === null) {
    return null;
  }

  if (
    typeof raw.id !== 'string' ||
    typeof raw.householdId !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.timezone !== 'string' ||
    raw.status !== 'confirmed' ||
    typeof externalReference.id !== 'string' ||
    typeof externalReference.provider !== 'string' ||
    typeof externalReference.externalId !== 'string' ||
    typeof externalReference.authoritative !== 'boolean'
  ) {
    return null;
  }

  return {
    id: raw.id as CalendarEvent['id'],
    householdId: raw.householdId as CalendarEvent['householdId'],
    title: raw.title,
    startsAt,
    endsAt,
    timezone: raw.timezone,
    status: 'confirmed',
    externalReference: {
      id: externalReference.id as CalendarEvent['externalReference']['id'],
      provider: externalReference.provider,
      externalId: externalReference.externalId,
      lastSyncedAt,
      authoritative: externalReference.authoritative,
      ...(typeof externalReference.externalVersion === 'string'
        ? { externalVersion: externalReference.externalVersion }
        : {}),
      ...(typeof externalReference.etag === 'string' ? { etag: externalReference.etag } : {}),
      ...(typeof externalReference.syncToken === 'string'
        ? { syncToken: externalReference.syncToken }
        : {}),
    },
  };
}

export async function updateContextFromEvent(
  event: AgnesEvent,
  store: ContextStore,
): Promise<void> {
  const calendarEvent = readCalendarEvent(event);
  if (calendarEvent === null) {
    return;
  }

  const existing = await store.get(event.householdId);
  const context = existing ?? emptyHouseholdContext(event.householdId, event.occurredAt);

  await store.put({
    ...context,
    timestamp: new Date(event.occurredAt),
    upcomingEvents: [...context.upcomingEvents, calendarEvent],
  });
}
