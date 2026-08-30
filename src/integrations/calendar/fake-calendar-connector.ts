import type {
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  ConnectorSyncResult,
} from '../connector.js';
import type { ExternalCalendarRecord } from './external-calendar-record.js';

const CAPABILITIES: ConnectorCapabilities = {
  read: true,
  write: false,
  subscribe: false,
  realtime: false,
  search: false,
  execute: false,
};

export class FakeCalendarConnector implements Connector<ExternalCalendarRecord> {
  readonly id = 'test-calendar';
  private connected = true;

  constructor(private readonly records: readonly ExternalCalendarRecord[]) {}

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
    return CAPABILITIES;
  }

  async sync(cursor?: string): Promise<ConnectorSyncResult<ExternalCalendarRecord>> {
    const records = this.records.map((record) => ({ ...record }));
    return cursor === undefined ? { records } : { records, cursor };
  }
}
