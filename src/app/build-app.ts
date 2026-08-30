import Fastify, { type FastifyInstance } from 'fastify';
import type { Clock } from '../kernel/clock.js';
import { SystemClock } from '../kernel/clock.js';
import type { HealthConfig } from '../health/health-config.js';
import { defaultHealthConfig } from '../health/health-config.js';
import { HealthBridgeAuthenticator } from '../health/health-authenticator.js';
import { HealthStatusService } from '../health/health-status-service.js';
import { importHealthMeasurement } from '../health/import-health-measurement.js';
import { recordHealthHeartbeat } from '../health/record-health-heartbeat.js';
import { ConnectorRegistry } from '../integrations/connector-registry.js';
import { HealthConnector } from '../integrations/health/health-connector.js';
import { PostgresAuditRepository } from '../persistence/postgres-audit-repository.js';
import { PostgresHealthBridgeRepository } from '../persistence/postgres-health-bridge-repository.js';
import { PostgresHealthMeasurementRepository } from '../persistence/postgres-health-measurement-repository.js';
import { PostgresOutboxRepository } from '../persistence/postgres-outbox-repository.js';
import { createPostgresPool, withTransaction } from '../persistence/postgres.js';
import { registerHealthRoutes } from '../transport/health-routes.js';
import { registerIntegrationStatusRoutes } from '../transport/integration-status-routes.js';

export interface BuildAppOptions {
  readonly databaseUrl: string;
  readonly healthBridgeId: string;
  readonly healthConfig?: HealthConfig;
  readonly clock?: Clock;
  readonly logger?: boolean;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const pool = createPostgresPool(options.databaseUrl);
  const clock = options.clock ?? new SystemClock();
  const healthConfig = options.healthConfig ?? defaultHealthConfig;

  const bridgeRepository = new PostgresHealthBridgeRepository(pool);
  const measurementRepository = new PostgresHealthMeasurementRepository(pool);
  const outboxRepository = new PostgresOutboxRepository(pool);
  const auditRepository = new PostgresAuditRepository(pool);

  const authenticator = new HealthBridgeAuthenticator(bridgeRepository);
  const statusService = new HealthStatusService(bridgeRepository, clock, healthConfig);

  const registry = new ConnectorRegistry();
  registry.register(new HealthConnector(options.healthBridgeId, statusService));

  const app = Fastify({ logger: options.logger ?? false });

  await registerHealthRoutes(app, {
    authenticator,
    statusService,
    recordHeartbeat: (bridge) => recordHealthHeartbeat(bridge, { bridgeRepository, clock }),
    importMeasurement: (raw, bridge, correlationId) =>
      importHealthMeasurement(raw, bridge, {
        measurementRepository,
        bridgeRepository,
        outboxRepository,
        auditRepository,
        clock,
        config: healthConfig,
        correlationId,
        runInTransaction: (operation) => withTransaction(pool, operation),
      }),
  });
  await registerIntegrationStatusRoutes(app, {
    registry,
    connectorIds: ['health'],
  });

  app.addHook('onClose', async () => {
    await pool.end();
  });

  return app;
}
