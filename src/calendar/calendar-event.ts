import { ValidationError } from '../kernel/errors.js';
import {
  newCalendarEventId,
  type CalendarEventId,
  type HouseholdId,
  type PersonId,
} from '../kernel/ids.js';
import type { Clock } from '../kernel/clock.js';
import type { ExternalReference } from '../integrations/calendar/external-calendar-record.js';

export type CalendarEventVisibility = 'household' | 'private';
export type CalendarEventStatus = 'confirmed' | 'cancelled';

export interface CalendarEvent {
  readonly id: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId: PersonId | null;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants: readonly PersonId[];
  readonly locationId: string | null;
  readonly recurrence: string | null;
  readonly visibility: CalendarEventVisibility;
  readonly status: CalendarEventStatus;
  readonly externalReference: ExternalReference | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCalendarEventInput {
  readonly id?: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId | null;
  readonly title: string;
  readonly description?: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants?: readonly PersonId[];
  readonly locationId?: string | null;
  readonly recurrence?: string | null;
  readonly visibility?: CalendarEventVisibility;
  readonly status?: CalendarEventStatus;
  readonly externalReference?: ExternalReference | null;
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

export function assertCalendarRange(startsAt: Date, endsAt: Date): void {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new ValidationError('calendar event dates must be valid');
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('endsAt must be after startsAt');
  }
}

export function createCalendarEvent(input: CreateCalendarEventInput, clock: Clock): CalendarEvent {
  assertCalendarRange(input.startsAt, input.endsAt);
  const now = clock.now();

  return Object.freeze({
    id: input.id ?? newCalendarEventId(),
    householdId: input.householdId,
    ownerPersonId: input.ownerPersonId ?? null,
    title: required(input.title, 'title'),
    description: input.description?.trim() || null,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    timezone: validTimezone(input.timezone),
    participants: Object.freeze([...(input.participants ?? [])]),
    locationId: input.locationId ?? null,
    recurrence: input.recurrence ?? null,
    visibility: input.visibility ?? 'household',
    status: input.status ?? 'confirmed',
    externalReference: input.externalReference ?? null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
}
