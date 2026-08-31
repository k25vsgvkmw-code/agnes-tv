import type { Pool, PoolClient } from 'pg';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { OutboxRecord, OutboxRepository } from '../events/outbox.js';
import { ValidationError } from '../kernel/errors.js';
import type { EventId, HouseholdId, PersonId } from '../kernel/ids.js';

interface OutboxRow {
  event_id: string;
  event_type: string;
  event_version: number;
  occurred_at: Date;
  received_at: Date;
  source: string;
  household_id: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  correlation_id: string | null;
  causation_id: string | null;
  payload: unknown;
  metadata: Record<string, unknown>;
  publication_state: 'pending' | 'processing' | 'published';
  attempts: number;
  available_at: Date;
  published_at: Date | null;
  last_error: string | null;
}

function toRecord(row: OutboxRow): OutboxRecord {
  const event: AgnesEvent = {
    id: row.event_id as EventId,
    type: row.event_type,
    version: row.event_version,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    source: row.source,
    householdId: row.household_id as HouseholdId,
    ...(row.actor_id ? { actorId: row.actor_id as PersonId } : {}),
    ...(row.entity_type ? { entityType: row.entity_type } : {}),
    ...(row.entity_id ? { entityId: row.entity_id } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.causation_id ? { causationId: row.causation_id } : {}),
    payload: row.payload,
    metadata: row.metadata,
  };

  return {
    event,
    publicationState: row.publication_state,
    attempts: row.attempts,
    availableAt: row.available_at,
    publishedAt: row.published_at,
    lastError: row.last_error,
  };
}

export class PostgresOutboxRepository implements OutboxRepository {
  constructor(private readonly db: Pool) {}

  async append(tx: PoolClient, event: AgnesEvent): Promise<void> {
    await tx.query(
      `insert into outbox_events(
        event_id,event_type,event_version,occurred_at,received_at,source,household_id,
        actor_id,entity_type,entity_id,correlation_id,causation_id,payload,metadata
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)`,
      [
        event.id,
        event.type,
        event.version,
        event.occurredAt,
        event.receivedAt,
        event.source,
        event.householdId,
        event.actorId ?? null,
        event.entityType ?? null,
        event.entityId ?? null,
        event.correlationId ?? null,
        event.causationId ?? null,
        JSON.stringify(event.payload),
        JSON.stringify(event.metadata),
      ],
    );
  }

  async claimBatch(limit: number): Promise<readonly OutboxRecord[]> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new ValidationError('outbox claim limit must be a positive integer');
    }

    const tx = await this.db.connect();
    try {
      await tx.query('begin');
      const result = await tx.query<OutboxRow>(
        `with candidates as (
          select event_id
          from outbox_events
          where publication_state = 'pending' and available_at <= now()
          order by created_at
          for update skip locked
          limit $1
        )
        update outbox_events as outbox
        set publication_state = 'processing', attempts = outbox.attempts + 1
        from candidates
        where outbox.event_id = candidates.event_id
        returning outbox.*`,
        [limit],
      );
      await tx.query('commit');
      return result.rows.map(toRecord);
    } catch (error) {
      await tx.query('rollback');
      throw error;
    } finally {
      tx.release();
    }
  }

  async markPublished(id: EventId): Promise<void> {
    await this.db.query(
      `update outbox_events
       set publication_state = 'published', published_at = now(), last_error = null
       where event_id = $1`,
      [id],
    );
  }
}
