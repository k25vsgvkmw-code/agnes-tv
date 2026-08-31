export interface AuditRecord {
  readonly id: string;
  readonly type: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly correlationId: string;
  readonly occurredAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}
