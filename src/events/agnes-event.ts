import type { Clock } from '../kernel/clock.js';
import { newEventId, type EventId, type HouseholdId, type PersonId } from '../kernel/ids.js';

export interface AgnesEvent<TPayload = unknown> {
  readonly id: EventId;
  readonly type: string;
  readonly version: number;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly source: string;
  readonly householdId: HouseholdId;
  readonly actorId?: PersonId;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly payload: TPayload;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateAgnesEventInput<TPayload> {
  readonly type: string;
  readonly version: number;
  readonly occurredAt?: Date;
  readonly source: string;
  readonly householdId: HouseholdId;
  readonly actorId?: PersonId;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly payload: TPayload;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createAgnesEvent<TPayload>(
  input: CreateAgnesEventInput<TPayload>,
  clock: Clock,
): AgnesEvent<TPayload> {
  const receivedAt = clock.now();

  return {
    id: newEventId(),
    type: input.type,
    version: input.version,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(receivedAt),
    receivedAt: new Date(receivedAt),
    source: input.source,
    householdId: input.householdId,
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(input.causationId ? { causationId: input.causationId } : {}),
    payload: input.payload,
    metadata: input.metadata ?? {},
  };
}
