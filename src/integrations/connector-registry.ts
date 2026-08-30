import type { Connector, ConnectorHealth } from './connector.js';

type RegisteredConnector = Connector<unknown, never>;

export class ConnectorRegistry {
  private readonly connectors = new Map<string, RegisteredConnector>();

  register(connector: RegisteredConnector): void {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): RegisteredConnector | undefined {
    return this.connectors.get(id);
  }

  async health(id: string): Promise<ConnectorHealth> {
    const connector = this.connectors.get(id);
    if (connector === undefined) {
      throw new Error(`connector not registered: ${id}`);
    }

    return connector.health();
  }
}
