import { describe, expect, it } from 'vitest';
import type {
  Connector,
  ConnectorHealth,
  ConnectorHealthState,
} from '../../src/integrations/connector.js';
import { ConnectorRegistry } from '../../src/integrations/connector-registry.js';
import { summarizeConnectorHealth } from '../../src/integrations/connector-summary.js';
import { HealthConnector } from '../../src/integrations/health/health-connector.js';
import type { HealthBridgeStatus } from '../../src/health/health-bridge.js';

function fakeConnector(id: string, state: ConnectorHealthState): Connector<never> {
  return {
    id,
    async connect() {},
    async disconnect() {},
    async health(): Promise<ConnectorHealth> {
      return { state };
    },
    capabilities() {
      return { read: true, write: false };
    },
    async sync() {
      return { records: [] };
    },
  };
}

function status(state: HealthBridgeStatus['state']): HealthBridgeStatus {
  return {
    state,
    lastHeartbeatAt: null,
    lastMeasurementAt: null,
    evaluatedAt: new Date('2026-08-30T12:00:00Z'),
  };
}

describe('truthful health connector status', () => {
  it('does not count connected_no_data as live', async () => {
    const registry = new ConnectorRegistry();
    registry.register(fakeConnector('weather', 'connected'));
    registry.register(fakeConnector('health', 'connected_no_data'));

    const summary = await summarizeConnectorHealth(registry, ['weather', 'health']);

    expect(summary).toMatchObject({ total: 2, live: 1 });
    expect(summary.items.map((item) => [item.id, item.state])).toEqual([
      ['weather', 'connected'],
      ['health', 'connected_no_data'],
    ]);
  });

  it('maps a live health bridge to a connected generic connector', async () => {
    const connector = new HealthConnector('bridge-1', {
      getStatus: async () => status('live'),
    });

    expect(await connector.health()).toEqual({ state: 'connected' });
  });

  it('preserves connected_no_data without claiming health is live', async () => {
    const connector = new HealthConnector('bridge-1', {
      getStatus: async () => status('connected_no_data'),
    });

    expect(await connector.health()).toEqual({ state: 'connected_no_data' });
  });
});
