import type { PoolClient } from 'pg';
import { createAgnesEvent } from '../events/agnes-event.js';
import type { OutboxRepository } from '../events/outbox.js';
import type { ExternalCalendarRecord } from '../integrations/calendar/external-calendar-record.js';
import { normalizeCalendarRecord } from '../integrations/calendar/calendar-normalizer.js';
import type { Clock } from '../kernel/clock.js';
import type { HouseholdId } from '../kernel/ids.js';
import { createCalendarEvent, type CalendarEvent } from './calendar-event.js';
import type { CalendarRepository, CalendarUpsertChange } from './calendar-repository.js';

export interface TransactionalCalendarRepository extends CalendarRepository {
  upsertByExternalReferenceInTransaction(
    tx: PoolClient,
    event: CalendarEvent,
  ): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }>;
}

export type TransactionRunner = <T>(work: (tx: PoolClient) => Promise<T>) => Promise<T>;

export interface CalendarImportContext {
  readonly householdId: HouseholdId;
  readonly calendarRepository: TransactionalCalendarRepository;
  readonly outboxRepository: OutboxRepository;
  readonly clock: Clock;
  readonly transaction: TransactionRunner;
}

export interface CalendarEventChangedPayload {
  readonly event: {
    readonly id: string;
    readonly householdId: string;
    readonly title: string;
    readonly description: string | null;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly timezone: string;
    readonly status: string;
  };
  readonly change: Exclude<CalendarUpsertChange, 'unchanged'>;
}

function toPayload(
  event: CalendarEvent,
  change: Exclude<CalendarUpsertChange, 'unchanged'>,
): CalendarEventChangedPayload {
  return {
    event: {
      id: event.id,
      householdId: event.householdId,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      status: event.status,
    },
    change,
  };
}

export async function importCalendarRecord(
  record: ExternalCalendarRecord,
  context: CalendarImportContext,
): Promise<{ event: CalendarEvent; change: CalendarUpsertChange }> {
  const normalized = normalizeCalendarRecord(record, context.clock);
  const candidate = createCalendarEvent({
    householdId: context.householdId,
    title: normalized.title,
    description: normalized.description,
    startsAt: normalized.startsAt,
    endsAt: normalized.endsAt,
    timezone: normalized.timezone,
    externalReference: normalized.externalReference,
  });

  return context.transaction(async (tx) => {
    const result = await context.calendarRepository.upsertByExternalReferenceInTransaction(
      tx,
      candidate,
    );

    if (result.change === 'unchanged') {
      return result;
    }

    const domainEvent = createAgnesEvent(
      {
        type:
          result.change === 'created'
            ? 'calendar.event.created.v1'
            : 'calendar.event.updated.v1',
        version: 1,
        source: record.provider,
        householdId: context.householdId,
        entityType: 'calendar_event',
        entityId: result.event.id,
        correlationId: `calendar:${record.provider}:${record.externalId}`,
        payload: toPayload(result.event, result.change),
        metadata: {
          provider: record.provider,
          externalId: record.externalId,
        },
      },
      context.clock,
    );

    await context.outboxRepository.append(tx, domainEvent);
    return result;
  });
}
