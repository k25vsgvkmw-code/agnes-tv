import { createCalendarEvent, type CalendarEvent } from './calendar-event.js';
import type { CalendarUpsertChange } from './calendar-repository.js';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { ExternalCalendarRecord } from '../integrations/calendar/external-calendar-record.js';
import { normalizeCalendarRecord } from '../integrations/calendar/calendar-normalizer.js';
import type { Clock } from '../kernel/clock.js';
import { newEventId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export interface TransactionalCalendarRepository<TTransaction> {
  upsertByExternalReference(
    event: CalendarEvent,
    transaction?: TTransaction,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }>;
}

export interface TransactionalCalendarOutbox<TTransaction> {
  append(event: AgnesEvent, transaction?: TTransaction): Promise<void>;
}

export interface CalendarImportContext<TTransaction> {
  readonly householdId: HouseholdId;
  readonly ownerPersonId?: PersonId;
  readonly participants?: readonly PersonId[];
  readonly visibility?: CalendarEvent['visibility'];
  readonly status?: CalendarEvent['status'];
  readonly correlationId?: string;
  readonly clock: Clock;
  readonly calendarRepository: TransactionalCalendarRepository<TTransaction>;
  readonly outboxRepository: TransactionalCalendarOutbox<TTransaction>;
  readonly runInTransaction: <T>(
    operation: (transaction: TTransaction) => Promise<T>,
  ) => Promise<T>;
}

export interface CalendarImportResult {
  readonly event: CalendarEvent;
  readonly change: CalendarUpsertChange;
}

interface CalendarEventPayload {
  readonly id: string;
  readonly title: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly participants: readonly string[];
  readonly visibility: CalendarEvent['visibility'];
  readonly status: CalendarEvent['status'];
  readonly ownerPersonId?: string;
  readonly description?: string;
}

function eventPayload(event: CalendarEvent): CalendarEventPayload {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    participants: event.participants,
    visibility: event.visibility,
    status: event.status,
    ...(event.ownerPersonId === undefined ? {} : { ownerPersonId: event.ownerPersonId }),
    ...(event.description === undefined ? {} : { description: event.description }),
  };
}

function importedEvent(
  event: CalendarEvent,
  change: Exclude<CalendarUpsertChange, 'unchanged'>,
  provider: string,
  externalId: string,
  occurredAt: Date,
  correlationId?: string,
): AgnesEvent<CalendarEventPayload> {
  return {
    id: newEventId(),
    type: change === 'created' ? 'calendar.event.created.v1' : 'calendar.event.updated.v1',
    version: 1,
    occurredAt,
    receivedAt: occurredAt,
    source: provider,
    householdId: event.householdId,
    entityType: 'calendar_event',
    entityId: event.id,
    payload: eventPayload(event),
    metadata: { provider, externalId },
    ...(correlationId === undefined ? {} : { correlationId }),
  };
}

export async function importCalendarRecord<TTransaction>(
  record: ExternalCalendarRecord,
  context: CalendarImportContext<TTransaction>,
): Promise<CalendarImportResult> {
  return context.runInTransaction(async (transaction) => {
    const importedAt = context.clock.now();
    const normalized = normalizeCalendarRecord(record, importedAt);
    const candidate = createCalendarEvent({
      householdId: context.householdId,
      title: normalized.title,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      timezone: normalized.timezone,
      externalReference: normalized.externalReference,
      ...(normalized.description === undefined ? {} : { description: normalized.description }),
      ...(context.ownerPersonId === undefined ? {} : { ownerPersonId: context.ownerPersonId }),
      ...(context.participants === undefined ? {} : { participants: context.participants }),
      ...(context.visibility === undefined ? {} : { visibility: context.visibility }),
      ...(context.status === undefined ? {} : { status: context.status }),
    });

    const result = await context.calendarRepository.upsertByExternalReference(
      candidate,
      transaction,
    );
    if (result.change === 'unchanged') return result;

    await context.outboxRepository.append(
      importedEvent(
        result.event,
        result.change,
        normalized.externalReference.provider,
        normalized.externalReference.externalId,
        importedAt,
        context.correlationId,
      ),
      transaction,
    );

    return result;
  });
}
