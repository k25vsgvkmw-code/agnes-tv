import type { Connector, ConnectorHealth } from './connector.js';

type RegisteredConnector = Connector<unknown, unknown>;

export class ConnectorRegistry {
  private readonly connectors = new Map<string, RegisteredConnector>();

  register<TRecord, TAction>(connector: Connector<TRecord, TAction>): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`connector already registered: ${connector.id}`);
    }

    this.connectors.set(connector.id, connector as RegisteredConnector);
  }

  get(id: string): RegisteredConnector | undefined {
    return this.connectors.get(id);
  }

  async health(id: string): Promise<ConnectorHealth> {
    const connector = this.connectors.get(id);
    if (connector === undefined) {
      return { state: 'disconnected', message: `connector not registered: ${id}` };
    }

    return connector.health();
  }
}
