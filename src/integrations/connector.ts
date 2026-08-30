export type ConnectorHealthState =
  | 'connected'
  | 'connected_no_data'
  | 'degraded'
  | 'auth_expired'
  | 'rate_limited'
  | 'error'
  | 'disconnected';

export interface ConnectorHealth {
  readonly state: ConnectorHealthState;
}

export interface ConnectorCapabilities {
  readonly read: boolean;
  readonly write: boolean;
  readonly realtime?: boolean;
}

export interface ConnectorSyncResult<TRecord> {
  readonly records: readonly TRecord[];
  readonly cursor?: string;
}

export interface Connector<TRecord = unknown, TAction = never> {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<ConnectorHealth>;
  capabilities(): ConnectorCapabilities;
  sync(cursor?: string): Promise<ConnectorSyncResult<TRecord>>;
  execute?(action: TAction): Promise<unknown>;
}
