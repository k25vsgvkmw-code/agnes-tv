import type {
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  ConnectorSyncResult,
} from '../connector.js';
import type { ExternalCalendarRecord } from './external-calendar-record.js';

export class FakeCalendarConnector implements Connector<ExternalCalendarRecord> {
  private connected = false;

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
    return {
      state: this.connected ? 'connected' : 'disconnected',
      checkedAt: new Date(),
    };
  }

  capabilities(): ConnectorCapabilities {
    return { read: true, write: false, incrementalSync: true };
  }

  async sync(cursor?: string): Promise<ConnectorSyncResult<ExternalCalendarRecord>> {
    if (!this.connected) {
      throw new Error(`connector ${this.id} is disconnected`);
    }

    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const records = this.records.slice(safeOffset);

    return {
      records,
      cursor: String(this.records.length),
    };
  }
}
