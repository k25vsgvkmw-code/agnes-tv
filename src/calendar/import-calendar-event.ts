import type { CalendarRepository, CalendarUpsertChange } from './calendar-repository.js';
import type { CalendarEvent } from './calendar-event.js';
import { createAgnesEvent, type AgnesEvent } from '../events/agnes-event.js';
import type { OutboxRepository } from '../events/outbox.js';
import type { Clock } from '../kernel/clock.js';
import type { HouseholdId } from '../kernel/ids.js';
import { normalizeCalendarRecord } from '../integrations/calendar/calendar-normalizer.js';
import type { ExternalCalendarRecord } from '../integrations/calendar/external-calendar-record.js';

export interface CalendarImportContext {
  readonly householdId: HouseholdId;
  readonly correlationId?: string;
}

export interface CalendarImportResult {
  readonly event: CalendarEvent;
  readonly change: CalendarUpsertChange;
  readonly domainEvent?: AgnesEvent<{ calendarEvent: CalendarEvent }>;
}

export type TransactionRunner<TTransaction> = <T>(
  work: (transaction: TTransaction) => Promise<T>,
) => Promise<T>;

export interface CalendarImportDependencies<TTransaction> {
  readonly calendarRepository: CalendarRepository<TTransaction>;
  readonly outboxRepository: OutboxRepository<TTransaction>;
  readonly clock: Clock;
  readonly runInTransaction: TransactionRunner<TTransaction>;
}

export async function importCalendarRecord<TTransaction>(
  record: ExternalCalendarRecord,
  context: CalendarImportContext,
  dependencies: CalendarImportDependencies<TTransaction>,
): Promise<CalendarImportResult> {
  const now = dependencies.clock.now();
  const normalized = normalizeCalendarRecord(record, {
    householdId: context.householdId,
    lastSyncedAt: now,
  });

  return dependencies.runInTransaction(async (transaction) => {
    const result = await dependencies.calendarRepository.upsertByExternalReference(
      normalized,
      transaction,
    );

    if (result.change === 'unchanged') {
      return result;
    }

    const eventType =
      result.change === 'created' ? 'calendar.event.created.v1' : 'calendar.event.updated.v1';
    const domainEvent = createAgnesEvent({
      type: eventType,
      version: 1,
      occurredAt: now,
      receivedAt: now,
      source: record.provider,
      householdId: context.householdId,
      entityType: 'calendar_event',
      entityId: result.event.id,
      payload: { calendarEvent: result.event },
      metadata: {
        externalProvider: record.provider,
        externalId: record.externalId,
      },
      ...(context.correlationId === undefined ? {} : { correlationId: context.correlationId }),
    });

    await dependencies.outboxRepository.append(transaction, domainEvent);

    return {
      ...result,
      domainEvent,
    };
  });
}
