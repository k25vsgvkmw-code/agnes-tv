import type { Clock } from '../kernel/clock.js';
import { newEventId, type EventId, type HouseholdId } from '../kernel/ids.js';

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

export interface CreateAgnesEventInput<TPayload> {
  readonly id?: EventId;
  readonly type: string;
  readonly version?: number;
  readonly occurredAt?: Date;
  readonly source: string;
  readonly householdId: HouseholdId;
  readonly actorId?: string;
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

  return Object.freeze({
    id: input.id ?? newEventId(),
    type: input.type,
    version: input.version ?? 1,
    occurredAt: new Date(input.occurredAt ?? receivedAt),
    receivedAt: new Date(receivedAt),
    source: input.source,
    householdId: input.householdId,
    ...(input.actorId === undefined ? {} : { actorId: input.actorId }),
    ...(input.entityType === undefined ? {} : { entityType: input.entityType }),
    ...(input.entityId === undefined ? {} : { entityId: input.entityId }),
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId }),
    payload: input.payload,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}
