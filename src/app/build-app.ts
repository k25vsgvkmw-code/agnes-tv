import { Pool, type PoolClient } from 'pg';
import { acknowledgeNotification as acknowledgeNotificationUseCase } from '../notifications/acknowledge-notification.js';
import type { AuditRepository } from '../audit/audit-repository.js';
import {
  importCalendarRecord,
  type CalendarImportResult,
  type TransactionRunner,
} from '../calendar/import-calendar-event.js';
import { InMemoryContextStore } from '../context/in-memory-context-store.js';
import { updateContextFromEvent } from '../context/update-context-from-event.js';
import { decideSituation, type DecisionOutcome } from '../decisions/decide-situation.js';
import { scoreDecision } from '../decisions/decision-score.js';
import { InMemoryDomainEventBus } from '../events/domain-event-bus.js';
import type { ModelGateway } from '../intelligence/model-gateway.js';
import { FakeCalendarConnector } from '../integrations/calendar/fake-calendar-connector.js';
import type { ExternalCalendarRecord } from '../integrations/calendar/external-calendar-record.js';
import type { Connector } from '../integrations/connector.js';
import { ConnectorRegistry } from '../integrations/connector-registry.js';
import type { Clock } from '../kernel/clock.js';
import { SystemClock } from '../kernel/clock.js';
import { newEventId, type HouseholdId } from '../kernel/ids.js';
import { createNotification } from '../notifications/create-notification.js';
import type { NotificationDelivery } from '../notifications/notification-delivery.js';
import type { Notification } from '../notifications/notification.js';
import type { NotificationRepository } from '../notifications/notification-repository.js';
import { evaluateCapability } from '../permissions/policy-engine.js';
import { PostgresCalendarRepository } from '../persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../persistence/postgres-outbox-repository.js';
import { DepartureRiskDetector } from '../situations/departure-risk-detector.js';
import type { Situation } from '../situations/situation.js';
import { OutboxWorker } from '../workers/outbox-worker.js';

export interface BuildAppConfig {
  readonly databaseUrl: string;
  readonly modelGateway: ModelGateway;
  readonly clock?: Clock;
  readonly calendarConnector?: Connector<ExternalCalendarRecord>;
  readonly notificationRepository?: NotificationRepository;
  readonly notificationDelivery?: NotificationDelivery;
  readonly auditRepository?: AuditRepository;
}

export interface DepartureSuggestionInput {
  readonly householdId: HouseholdId;
  readonly eventStartsAt: Date;
  readonly travelMinutes: number;
  readonly bufferMinutes: number;
  readonly correlationId: string;
}

export interface DepartureSuggestionResult {
  readonly situation: Situation | null;
  readonly outcome: DecisionOutcome;
  readonly notification: Notification | null;
}

export async function buildApp(config: BuildAppConfig) {
  if (config.databaseUrl.trim().length === 0) {
    throw new Error('databaseUrl is required');
  }

  const database = new Pool({ connectionString: config.databaseUrl });
  const clock = config.clock ?? new SystemClock();
  const householdRepository = new PostgresHouseholdRepository(database);
  const calendarRepository = new PostgresCalendarRepository(database);
  const outboxRepository = new PostgresOutboxRepository(database);
  const domainEventBus = new InMemoryDomainEventBus();
  const contextStore = new InMemoryContextStore();
  const connectorRegistry = new ConnectorRegistry();
  const calendarConnector = config.calendarConnector ?? new FakeCalendarConnector([]);

  connectorRegistry.register(calendarConnector);

  const unsubscribeCalendarCreated = domainEventBus.subscribe(
    'calendar.event.created.v1',
    async (event) => {
      await updateContextFromEvent(event, contextStore);
    },
  );

  const outboxWorker = new OutboxWorker(outboxRepository, domainEventBus, clock);
  const departureRiskDetector = new DepartureRiskDetector(clock);

  const runInTransaction: TransactionRunner<PoolClient> = async (work) => {
    const transaction = await database.connect();
    try {
      await transaction.query('BEGIN');
      const result = await work(transaction);
      await transaction.query('COMMIT');
      return result;
    } catch (error) {
      await transaction.query('ROLLBACK');
      throw error;
    } finally {
      transaction.release();
    }
  };

  async function syncCalendar(householdId: HouseholdId): Promise<readonly CalendarImportResult[]> {
    const delta = await calendarConnector.sync();
    const imported: CalendarImportResult[] = [];

    for (const record of delta.records) {
      imported.push(
        await importCalendarRecord(
          record,
          { householdId, correlationId: newEventId() },
          {
            calendarRepository,
            outboxRepository,
            clock,
            runInTransaction,
          },
        ),
      );
    }

    return imported;
  }

  async function suggestDepartureIfRisk(
    input: DepartureSuggestionInput,
  ): Promise<DepartureSuggestionResult> {
    const situation =
      departureRiskDetector.detect({
        eventStartsAt: input.eventStartsAt,
        travelMinutes: input.travelMinutes,
        bufferMinutes: input.bufferMinutes,
      })[0] ?? null;

    if (situation === null) {
      return { situation: null, outcome: 'ignore', notification: null };
    }

    const urgency = 0.9;
    const policy = evaluateCapability({
      capability: 'calendar_departure_advice',
      requested: 'suggest',
      grant: { view: true, suggest: true, act: 'requires_confirmation' },
    });
    const score = scoreDecision({
      relevance: 1,
      urgency,
      impact: 0.8,
      confidence: situation.confidence,
      timingQuality: 1,
      interruptionCost: 0.1,
      repetitionPenalty: 0,
    });
    const outcome = decideSituation({
      policy,
      requestedOutcome: 'suggest',
      attentionState: 'available',
      urgency,
      score,
    });

    if (outcome !== 'suggest') {
      return { situation, outcome, notification: null };
    }

    if (config.notificationRepository === undefined || config.notificationDelivery === undefined) {
      throw new Error('notification dependencies are unavailable');
    }

    const notification = await createNotification(
      {
        householdId: input.householdId,
        outcome,
        title: 'Ώρα να φύγεις',
        message: 'Υπάρχει κίνδυνος καθυστέρησης.',
        situationType: situation.type,
        supportingFactors: situation.supportingFactors,
        correlationId: input.correlationId,
      },
      {
        repository: config.notificationRepository,
        delivery: config.notificationDelivery,
        clock,
      },
    );

    return { situation, outcome, notification };
  }

  async function acknowledgeNotification(id: string): Promise<Notification> {
    if (config.notificationRepository === undefined || config.auditRepository === undefined) {
      throw new Error('acknowledgement dependencies are unavailable');
    }

    return acknowledgeNotificationUseCase(id, {
      repository: config.notificationRepository,
      auditRepository: config.auditRepository,
      clock,
    });
  }

  return {
    database,
    householdRepository,
    calendarRepository,
    outboxRepository,
    domainEventBus,
    contextStore,
    connectorRegistry,
    outboxWorker,
    modelGateway: config.modelGateway,
    syncCalendar,
    suggestDepartureIfRisk,
    acknowledgeNotification,
    async close(): Promise<void> {
      unsubscribeCalendarCreated();
      await database.end();
    },
  };
}
