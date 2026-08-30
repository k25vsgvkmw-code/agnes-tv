import { newEventId, type EventId, type HouseholdId } from '../kernel/ids.js';

export type AgnesEventMetadata = Readonly<Record<string, unknown>>;

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
  readonly causationId?: EventId;
  readonly payload: TPayload;
  readonly metadata: AgnesEventMetadata;
}

export interface CreateAgnesEventInput<TPayload> {
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
  readonly causationId?: EventId;
  readonly payload: TPayload;
  readonly metadata: AgnesEventMetadata;
}

export function createAgnesEvent<TPayload>(input: CreateAgnesEventInput<TPayload>): AgnesEvent<TPayload> {
  return {
    id: newEventId(),
    type: input.type,
    version: input.version,
    occurredAt: new Date(input.occurredAt),
    receivedAt: new Date(input.receivedAt),
    source: input.source,
    householdId: input.householdId,
    payload: input.payload,
    metadata: input.metadata,
    ...(input.actorId === undefined ? {} : { actorId: input.actorId }),
    ...(input.entityType === undefined ? {} : { entityType: input.entityType }),
    ...(input.entityId === undefined ? {} : { entityId: input.entityId }),
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId }),
  };
}
