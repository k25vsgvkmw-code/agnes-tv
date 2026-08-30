import type { PoolClient } from 'pg';
import type { AuditRecordId, HouseholdId } from '../kernel/ids.js';

export type AuditOutcome = 'success' | 'failure';

export interface AuditRecord {
  readonly id: AuditRecordId;
  readonly householdId: HouseholdId;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly actorId?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly errorCode?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

export interface AuditRepository {
  append(record: AuditRecord, client?: PoolClient): Promise<void>;
}
