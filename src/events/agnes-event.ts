import type { EventId, HouseholdId } from '../kernel/ids.js';

export interface AgnesEvent<TPayload = unknown> {
  readonly id: EventId;
  readonly type: string;
  readonly version: number;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly source: string;
  readonly householdId: HouseholdId;
  readonly actorId?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly payload: TPayload;
  readonly metadata: Readonly<Record<string, unknown>>;
}
