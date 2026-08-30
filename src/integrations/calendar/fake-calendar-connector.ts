import type { Connector, ConnectorCapabilities, ConnectorHealth } from '../connector.js';
import type { ExternalCalendarRecord } from './external-calendar-record.js';

export class FakeCalendarConnector implements Connector<ExternalCalendarRecord> {
  private connected = true;

  constructor(
    readonly id: string,
    private readonly records: readonly ExternalCalendarRecord[],
  ) {}

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async health(): Promise<ConnectorHealth> {
    return { state: this.connected ? 'connected' : 'disconnected' };
  }

  capabilities(): ConnectorCapabilities {
    return { read: true, write: false };
  }

  async sync(): Promise<{ records: readonly ExternalCalendarRecord[] }> {
    return { records: this.records };
  }
}
