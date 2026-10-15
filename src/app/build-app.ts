import { Pool } from 'pg';
import { InMemoryContextStore } from '../context/in-memory-context-store.js';
import { updateContextFromEvent } from '../context/update-context-from-event.js';
import { EducationService } from '../education/education-service.js';
import { InMemoryDomainEventBus } from '../events/domain-event-bus.js';
import { ConnectorRegistry } from '../integrations/connector-registry.js';
import { FakeCalendarConnector } from '../integrations/calendar/fake-calendar-connector.js';
import type { ModelGateway } from '../intelligence/model-gateway.js';
import { SystemClock } from '../kernel/clock.js';
import { PostgresCalendarRepository } from '../persistence/postgres-calendar-repository.js';
import { PostgresEducationRepository } from '../persistence/postgres-education-repository.js';
import { PostgresHouseholdRepository } from '../persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../persistence/postgres-outbox-repository.js';
import { DepartureRiskDetector } from '../situations/departure-risk-detector.js';
import { OutboxWorker } from '../workers/outbox-worker.js';

export interface BuildAppOptions {
  readonly databaseUrl: string;
  readonly modelGateway: ModelGateway;
}

export interface AgnesApp {
  readonly modelGateway: ModelGateway;
  readonly connectorRegistry: ConnectorRegistry;
  readonly calendarRepository: PostgresCalendarRepository;
  readonly householdRepository: PostgresHouseholdRepository;
  readonly outboxRepository: PostgresOutboxRepository;
  readonly educationRepository: PostgresEducationRepository;
  readonly educationService: EducationService;
  readonly contextStore: InMemoryContextStore;
  readonly eventBus: InMemoryDomainEventBus;
  readonly outboxWorker: OutboxWorker;
  readonly departureRiskDetector: DepartureRiskDetector;
  close(): Promise<void>;
}

export async function buildApp(options: BuildAppOptions): Promise<AgnesApp> {
  const pool = new Pool({ connectionString: options.databaseUrl });
  const clock = new SystemClock();
  const eventBus = new InMemoryDomainEventBus();
  const contextStore = new InMemoryContextStore(clock);
  const connectorRegistry = new ConnectorRegistry();
  const testCalendarConnector = new FakeCalendarConnector('test-calendar', []);
  await testCalendarConnector.connect();
  connectorRegistry.register(testCalendarConnector);

  eventBus.subscribe('calendar.event.created.v1', (event) =>
    updateContextFromEvent(event, contextStore),
  );
  eventBus.subscribe('calendar.event.updated.v1', (event) =>
    updateContextFromEvent(event, contextStore),
  );

  const outboxRepository = new PostgresOutboxRepository(pool);
  const educationRepository = new PostgresEducationRepository(pool);
  const educationService = new EducationService(educationRepository);

  return {
    modelGateway: options.modelGateway,
    connectorRegistry,
    calendarRepository: new PostgresCalendarRepository(pool),
    householdRepository: new PostgresHouseholdRepository(pool),
    outboxRepository,
    educationRepository,
    educationService,
    contextStore,
    eventBus,
    outboxWorker: new OutboxWorker(outboxRepository, eventBus),
    departureRiskDetector: new DepartureRiskDetector(),
    async close(): Promise<void> {
      await testCalendarConnector.disconnect();
      await pool.end();
    },
  };
}
