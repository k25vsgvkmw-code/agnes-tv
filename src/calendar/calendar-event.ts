import { ValidationError } from '../kernel/errors.js';
import {
  newCalendarEventId,
  type CalendarEventId,
  type HouseholdId,
  type PersonId,
} from '../kernel/ids.js';
import type { ExternalReference } from '../integrations/calendar/external-calendar-record.js';

export type CalendarEventStatus = 'confirmed' | 'cancelled';

export interface CalendarEvent {
  readonly id: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly title: string;
  readonly description?: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants: readonly PersonId[];
  readonly visibility: 'private' | 'household';
  readonly status: CalendarEventStatus;
  readonly externalReference?: ExternalReference;
}

export interface CreateCalendarEventInput {
  readonly id?: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly title: string;
  readonly description?: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants?: readonly PersonId[];
  readonly visibility?: 'private' | 'household';
  readonly status?: CalendarEventStatus;
  readonly externalReference?: ExternalReference;
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const title = input.title.trim();
  const timezone = input.timezone.trim();

  if (!title) throw new ValidationError('calendar event title is required');
  if (!timezone) throw new ValidationError('calendar event timezone is required');
  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) {
    throw new ValidationError('startsAt must be a valid date');
  }
  if (!(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime())) {
    throw new ValidationError('endsAt must be a valid date');
  }
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new ValidationError('endsAt must be after startsAt');
  }

  const base = {
    id: input.id ?? newCalendarEventId(),
    householdId: input.householdId,
    title,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    timezone,
    participants: [...(input.participants ?? [])],
    visibility: input.visibility ?? ('household' as const),
    status: input.status ?? ('confirmed' as const),
  };

  return {
    ...base,
    ...(input.ownerPersonId === undefined ? {} : { ownerPersonId: input.ownerPersonId }),
    ...(input.description === undefined ? {} : { description: input.description.trim() }),
    ...(input.externalReference === undefined
      ? {}
      : { externalReference: input.externalReference }),
  };
}
