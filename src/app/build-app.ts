import { Pool } from 'pg';
import { InMemoryContextStore } from '../context/in-memory-context-store.js';
import { updateContextFromEvent } from '../context/update-context-from-event.js';
import { InMemoryDomainEventBus } from '../events/domain-event-bus.js';
import type { ModelGateway } from '../intelligence/model-gateway.js';
import { FakeCalendarConnector } from '../integrations/calendar/fake-calendar-connector.js';
import { ConnectorRegistry } from '../integrations/connector-registry.js';
import { PostgresCalendarRepository } from '../persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../persistence/postgres-outbox-repository.js';
import { OutboxWorker } from '../workers/outbox-worker.js';

export interface BuildAppConfig {
  readonly databaseUrl: string;
  readonly modelGateway: ModelGateway;
}

export async function buildApp(config: BuildAppConfig) {
  if (config.databaseUrl.trim().length === 0) {
    throw new Error('databaseUrl is required');
  }

  const database = new Pool({ connectionString: config.databaseUrl });
  const householdRepository = new PostgresHouseholdRepository(database);
  const calendarRepository = new PostgresCalendarRepository(database);
  const outboxRepository = new PostgresOutboxRepository(database);
  const domainEventBus = new InMemoryDomainEventBus();
  const contextStore = new InMemoryContextStore();
  const connectorRegistry = new ConnectorRegistry();
  const calendarConnector = new FakeCalendarConnector([]);

  connectorRegistry.register(calendarConnector);

  const unsubscribeCalendarCreated = domainEventBus.subscribe('calendar.event.created.v1', async (event) => {
    await updateContextFromEvent(event, contextStore);
  });

  const outboxWorker = new OutboxWorker(outboxRepository, domainEventBus);

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
    async close(): Promise<void> {
      unsubscribeCalendarCreated();
      await database.end();
    },
  };
}
