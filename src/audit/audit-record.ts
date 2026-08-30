import type { HouseholdId } from '../kernel/ids.js';

export interface AuditRecord {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly householdId: HouseholdId;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
