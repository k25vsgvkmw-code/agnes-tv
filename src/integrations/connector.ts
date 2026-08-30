export type ConnectorHealthState =
  | 'connected'
  | 'degraded'
  | 'auth_expired'
  | 'rate_limited'
  | 'error'
  | 'disconnected';

export interface ConnectorHealth {
  readonly state: ConnectorHealthState;
  readonly message?: string;
}

export interface ConnectorCapabilities {
  readonly read: boolean;
  readonly write: boolean;
  readonly subscribe: boolean;
  readonly realtime: boolean;
  readonly search: boolean;
  readonly execute: boolean;
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
