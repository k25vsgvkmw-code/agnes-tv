import type {
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  ConnectorSyncResult,
} from '../connector.js';
import type { ShoppingAction, ShoppingRecord } from './shopping-records.js';

export class FakeShoppingConnector implements Connector<ShoppingRecord, ShoppingAction> {
  private connected = false;

  constructor(
    readonly id: string,
    private readonly records: readonly ShoppingRecord[],
    private readonly handoffUrl?: string,
  ) {}

  connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  health(): Promise<ConnectorHealth> {
    return Promise.resolve({
      state: this.connected ? 'connected' : 'disconnected',
      checkedAt: new Date(),
    });
  }

  capabilities(): ConnectorCapabilities {
    return { read: true, write: this.handoffUrl !== undefined, incrementalSync: false, push: false };
  }

  sync(): Promise<ConnectorSyncResult<ShoppingRecord>> {
    if (!this.connected) return Promise.reject(new Error('fake shopping connector is disconnected'));
    return Promise.resolve({ records: this.records });
  }

  execute(action: ShoppingAction): Promise<unknown> {
    if (!this.handoffUrl) return Promise.reject(new Error('handoff is not supported'));
    if (action.kind === 'revalidate_basket') {
      return Promise.resolve({ supported: true, items: action.items });
    }
    return Promise.resolve({
      mode: 'retailer_handoff' as const,
      url: this.handoffUrl,
      preparedItemCount: action.items.length,
    });
  }
}
