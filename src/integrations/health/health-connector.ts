import type { HealthBridgeStatus } from '../../health/health-bridge.js';
import type { HealthStatusService } from '../../health/health-status-service.js';
import type { Connector, ConnectorCapabilities, ConnectorHealth } from '../connector.js';

type HealthStatusReader = Pick<HealthStatusService, 'getStatus'>;

function mapHealthState(state: HealthBridgeStatus['state']): ConnectorHealth['state'] {
  switch (state) {
    case 'live':
      return 'connected';
    case 'connected_no_data':
      return 'connected_no_data';
    case 'degraded':
      return 'degraded';
    case 'auth_expired':
      return 'auth_expired';
    case 'disconnected':
      return 'disconnected';
  }
}

export class HealthConnector implements Connector<never> {
  readonly id = 'health';

  constructor(
    private readonly bridgeId: string,
    private readonly statusService: HealthStatusReader,
  ) {}

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async health(): Promise<ConnectorHealth> {
    const status = await this.statusService.getStatus(this.bridgeId);
    return { state: mapHealthState(status.state) };
  }

  capabilities(): ConnectorCapabilities {
    return { read: true, write: false, realtime: true };
  }

  async sync(): Promise<{ records: readonly never[] }> {
    return { records: [] };
  }
}
