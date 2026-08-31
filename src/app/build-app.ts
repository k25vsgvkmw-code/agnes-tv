import { Pool } from 'pg';
import { InMemoryContextStore } from '../context/in-memory-context-store.js';
import { updateContextFromEvent } from '../context/update-context-from-event.js';
import { InMemoryDomainEventBus } from '../events/domain-event-bus.js';
import { FakeCalendarConnector } from '../integrations/calendar/fake-calendar-connector.js';
import type { Connector } from '../integrations/connector.js';
import { ConnectorRegistry } from '../integrations/connector-registry.js';
import { AlphaMegaConnector } from '../integrations/shopping/alphamega-connector.js';
import { EKalathiConnector } from '../integrations/shopping/ekalathi-connector.js';
import { LidlConnector } from '../integrations/shopping/lidl-connector.js';
import { NodeSourceFetcher } from '../integrations/shopping/source-fetcher.js';
import type { ShoppingAction, ShoppingRecord } from '../integrations/shopping/shopping-records.js';
import type { ModelGateway } from '../intelligence/model-gateway.js';
import { SystemClock } from '../kernel/clock.js';
import { PostgresCalendarRepository } from '../persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../persistence/postgres-outbox-repository.js';
import { PostgresShoppingRepository } from '../persistence/postgres-shopping-repository.js';
import { BasketService } from '../shopping/basket-service.js';
import { CheckoutService } from '../shopping/checkout-service.js';
import { ImportShoppingRecords } from '../shopping/import-shopping-records.js';
import type { RetailerSlug } from '../shopping/shopping-types.js';
import { SupermarketHomeService } from '../shopping/supermarket-home.js';
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
  readonly shoppingRepository: PostgresShoppingRepository;
  readonly outboxRepository: PostgresOutboxRepository;
  readonly contextStore: InMemoryContextStore;
  readonly eventBus: InMemoryDomainEventBus;
  readonly outboxWorker: OutboxWorker;
  readonly departureRiskDetector: DepartureRiskDetector;
  readonly basketService: BasketService;
  readonly checkoutService: CheckoutService;
  readonly shoppingImportService: ImportShoppingRecords;
  readonly supermarketHomeService: SupermarketHomeService;
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

  const sourceFetcher = new NodeSourceFetcher();
  const alphaMegaConnector = new AlphaMegaConnector(sourceFetcher);
  const lidlConnector = new LidlConnector(sourceFetcher);
  const eKalathiConnector = new EKalathiConnector(sourceFetcher);
  await alphaMegaConnector.connect();
  await lidlConnector.connect();
  await eKalathiConnector.connect();
  connectorRegistry.register(alphaMegaConnector as Connector<unknown, unknown>);
  connectorRegistry.register(lidlConnector as Connector<unknown, unknown>);
  connectorRegistry.register(eKalathiConnector as Connector<unknown, unknown>);

  eventBus.subscribe('calendar.event.created.v1', (event) =>
    updateContextFromEvent(event, contextStore),
  );
  eventBus.subscribe('calendar.event.updated.v1', (event) =>
    updateContextFromEvent(event, contextStore),
  );

  const outboxRepository = new PostgresOutboxRepository(pool);
  const shoppingRepository = new PostgresShoppingRepository(pool);
  const shoppingConnectors = new Map<RetailerSlug, Connector<ShoppingRecord, ShoppingAction>>([
    ['alphamega-cy', alphaMegaConnector],
    ['lidl-cy', lidlConnector],
    ['e-kalathi-cy', eKalathiConnector],
  ]);
  const basketService = new BasketService(shoppingRepository, clock);
  const checkoutService = new CheckoutService(shoppingRepository, shoppingConnectors, clock);
  const shoppingImportService = new ImportShoppingRecords(shoppingRepository, clock);
  const supermarketHomeService = new SupermarketHomeService(shoppingRepository, clock);

  return {
    modelGateway: options.modelGateway,
    connectorRegistry,
    calendarRepository: new PostgresCalendarRepository(pool),
    householdRepository: new PostgresHouseholdRepository(pool),
    shoppingRepository,
    outboxRepository,
    contextStore,
    eventBus,
    outboxWorker: new OutboxWorker(outboxRepository, eventBus),
    departureRiskDetector: new DepartureRiskDetector(),
    basketService,
    checkoutService,
    shoppingImportService,
    supermarketHomeService,
    async close(): Promise<void> {
      await testCalendarConnector.disconnect();
      await alphaMegaConnector.disconnect();
      await lidlConnector.disconnect();
      await eKalathiConnector.disconnect();
      await pool.end();
    },
  };
}
