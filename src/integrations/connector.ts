export type ConnectorHealthState =
  'connected' | 'degraded' | 'auth_expired' | 'rate_limited' | 'error' | 'disconnected';

export interface ConnectorCapabilities {
  readonly read: boolean;
  readonly write: boolean;
  readonly incrementalSync?: boolean;
  readonly push?: boolean;
}

export interface ConnectorHealth {
  readonly state: ConnectorHealthState;
  readonly checkedAt: Date;
  readonly message?: string;
}

export interface ConnectorSyncResult<TRecord> {
  readonly records: readonly TRecord[];
  readonly cursor?: string;
}

export interface Connector<TRecord, TAction = never> {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<ConnectorHealth>;
  capabilities(): ConnectorCapabilities;
  sync(cursor?: string): Promise<ConnectorSyncResult<TRecord>>;
  execute?(action: TAction): Promise<unknown>;
}
