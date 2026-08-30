import type { ConnectorCapabilities, ConnectorHealthState } from './connector.js';
import type { ConnectorRegistry } from './connector-registry.js';

export interface ConnectorSummaryItem {
  readonly id: string;
  readonly state: ConnectorHealthState;
  readonly capabilities: ConnectorCapabilities;
}

export interface ConnectorHealthSummary {
  readonly total: number;
  readonly live: number;
  readonly items: readonly ConnectorSummaryItem[];
}

export async function summarizeConnectorHealth(
  registry: ConnectorRegistry,
  connectorIds: readonly string[],
): Promise<ConnectorHealthSummary> {
  const items = await Promise.all(
    connectorIds.map(async (id): Promise<ConnectorSummaryItem> => {
      const connector = registry.get(id);
      if (connector === undefined) {
        throw new Error(`connector not registered: ${id}`);
      }

      const health = await connector.health();
      return {
        id,
        state: health.state,
        capabilities: connector.capabilities(),
      };
    }),
  );

  return {
    total: items.length,
    live: items.filter((item) => item.state === 'connected').length,
    items,
  };
}
