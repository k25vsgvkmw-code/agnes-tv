import { ValidationError } from '../kernel/errors.js';
import {
  newCalendarEventId,
  type CalendarEventId,
  type ExternalReferenceId,
  type HouseholdId,
  type PersonId,
} from '../kernel/ids.js';

export interface ExternalReference {
  readonly id: ExternalReferenceId;
  readonly provider: string;
  readonly externalId: string;
  readonly externalVersion: string | null;
  readonly etag: string | null;
  readonly syncToken: string | null;
  readonly lastSyncedAt: Date;
  readonly authoritative: boolean;
}

export type CalendarEventVisibility = 'household' | 'private' | 'shared';
export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

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
}

export interface CreateCalendarEventInput {
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly title: string;
  readonly description?: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly participants?: readonly PersonId[];
  readonly locationId?: string;
  readonly recurrence?: string;
  readonly visibility?: CalendarEventVisibility;
  readonly status?: CalendarEventStatus;
  readonly externalReference?: ExternalReference;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`calendar event ${field} is required`);
  }
  return normalized;
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new ValidationError('calendar event endsAt must be after startsAt');
  }

  return {
    id: newCalendarEventId(),
    householdId: input.householdId,
    ownerPersonId: input.ownerPersonId ?? null,
    title: requireText(input.title, 'title'),
    description: input.description?.trim() || null,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    timezone: requireText(input.timezone, 'timezone'),
    participants: [...(input.participants ?? [])],
    locationId: input.locationId?.trim() || null,
    recurrence: input.recurrence?.trim() || null,
    visibility: input.visibility ?? 'household',
    status: input.status ?? 'confirmed',
    externalReference: input.externalReference ?? null,
  };
}
