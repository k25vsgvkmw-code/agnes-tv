import type { FastifyInstance } from 'fastify';
import type { ConnectorRegistry } from '../integrations/connector-registry.js';
import { summarizeConnectorHealth } from '../integrations/connector-summary.js';

export interface IntegrationStatusRouteDependencies {
  readonly registry: ConnectorRegistry;
  readonly connectorIds: readonly string[];
}

export async function registerIntegrationStatusRoutes(
  app: FastifyInstance,
  dependencies: IntegrationStatusRouteDependencies,
): Promise<void> {
  app.get('/integrations/status', async () =>
    summarizeConnectorHealth(dependencies.registry, dependencies.connectorIds),
  );
}
