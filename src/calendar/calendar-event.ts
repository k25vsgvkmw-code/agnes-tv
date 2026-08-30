import { ValidationError } from '../kernel/errors.js';
import {
  newCalendarEventId,
  newExternalReferenceId,
  type CalendarEventId,
  type ExternalReferenceId,
  type HouseholdId,
} from '../kernel/ids.js';

export interface ExternalReference {
  readonly id: ExternalReferenceId;
  readonly provider: string;
  readonly externalId: string;
  readonly externalVersion?: string;
  readonly etag?: string;
  readonly syncToken?: string;
  readonly lastSyncedAt: Date;
  readonly authoritative: boolean;
}

export interface CreateExternalReferenceInput {
  readonly provider: string;
  readonly externalId: string;
  readonly externalVersion?: string;
  readonly etag?: string;
  readonly syncToken?: string;
  readonly lastSyncedAt: Date;
  readonly authoritative: boolean;
}

export interface CalendarEvent {
  readonly id: CalendarEventId;
  readonly householdId: HouseholdId;
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly status: 'confirmed';
  readonly externalReference: ExternalReference;
}

export interface CreateCalendarEventInput {
  readonly householdId: HouseholdId;
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly timezone: string;
  readonly externalReference: ExternalReference;
}

function requireText(field: string, value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required`, { field });
  }
  return normalized;
}

function copyValidDate(field: string, value: Date): Date {
  const copy = new Date(value);
  if (Number.isNaN(copy.getTime())) {
    throw new ValidationError(`${field} must be a valid date`, { field });
  }
  return copy;
}

export function createExternalReference(input: CreateExternalReferenceInput): ExternalReference {
  const base = {
    id: newExternalReferenceId(),
    provider: requireText('provider', input.provider),
    externalId: requireText('externalId', input.externalId),
    lastSyncedAt: copyValidDate('lastSyncedAt', input.lastSyncedAt),
    authoritative: input.authoritative,
  };

  return {
    ...base,
    ...(input.externalVersion === undefined ? {} : { externalVersion: input.externalVersion }),
    ...(input.etag === undefined ? {} : { etag: input.etag }),
    ...(input.syncToken === undefined ? {} : { syncToken: input.syncToken }),
  };
}

export function createCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const startsAt = copyValidDate('startsAt', input.startsAt);
  const endsAt = copyValidDate('endsAt', input.endsAt);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('endsAt must be after startsAt', {
      field: 'endsAt',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }

  return {
    id: newCalendarEventId(),
    householdId: input.householdId,
    title: requireText('title', input.title),
    startsAt,
    endsAt,
    timezone: requireText('timezone', input.timezone),
    status: 'confirmed',
    externalReference: input.externalReference,
  };
}
