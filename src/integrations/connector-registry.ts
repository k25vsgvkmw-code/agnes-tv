import type { Connector, ConnectorHealth } from './connector.js';

export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector<unknown, unknown>>();

  register(connector: Connector<unknown, unknown>): void {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): Connector<unknown, unknown> | undefined {
    return this.connectors.get(id);
  }

  list(): readonly Connector<unknown, unknown>[] {
    return [...this.connectors.values()];
  }

  async health(id: string): Promise<ConnectorHealth> {
    const connector = this.connectors.get(id);
    if (!connector) {
      return {
        state: 'disconnected',
        checkedAt: new Date(),
        message: `connector ${id} is not registered`,
      };
    }

    return connector.health();
  }
}
