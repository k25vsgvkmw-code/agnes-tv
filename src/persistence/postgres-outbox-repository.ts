import type { Pool, PoolClient } from 'pg';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { OutboxRecord, OutboxRepository } from '../events/outbox.js';
import type { EventId, HouseholdId } from '../kernel/ids.js';
import { withTransaction } from './postgres.js';

interface OutboxRow {
  readonly event_id: string;
  readonly event_type: string;
  readonly event_version: number;
  readonly occurred_at: Date;
  readonly received_at: Date;
  readonly source: string;
  readonly household_id: string;
  readonly actor_id: string | null;
  readonly entity_type: string | null;
  readonly entity_id: string | null;
  readonly correlation_id: string | null;
  readonly causation_id: string | null;
  readonly payload: unknown;
  readonly metadata: Record<string, unknown>;
  readonly attempts: number;
  readonly available_at: Date;
  readonly claimed_at: Date | null;
  readonly published_at: Date | null;
  readonly last_error: string | null;
}

function mapOutboxRow(row: OutboxRow): OutboxRecord {
  const event: AgnesEvent = {
    id: row.event_id as EventId,
    type: row.event_type,
    version: row.event_version,
    occurredAt: new Date(row.occurred_at),
    receivedAt: new Date(row.received_at),
    source: row.source,
    householdId: row.household_id as HouseholdId,
    payload: row.payload,
    metadata: row.metadata,
    ...(row.actor_id === null ? {} : { actorId: row.actor_id }),
    ...(row.entity_type === null ? {} : { entityType: row.entity_type }),
    ...(row.entity_id === null ? {} : { entityId: row.entity_id }),
    ...(row.correlation_id === null ? {} : { correlationId: row.correlation_id }),
    ...(row.causation_id === null ? {} : { causationId: row.causation_id as EventId }),
  };

  return {
    event,
    attempts: row.attempts,
    availableAt: new Date(row.available_at),
    claimedAt: row.claimed_at === null ? null : new Date(row.claimed_at),
    publishedAt: row.published_at === null ? null : new Date(row.published_at),
    lastError: row.last_error,
  };
}

export class PostgresOutboxRepository implements OutboxRepository<PoolClient> {
  constructor(private readonly database: Pool) {}

  async append(transaction: PoolClient, event: AgnesEvent): Promise<void> {
    await transaction.query(
      `INSERT INTO outbox_events(
        event_id,
        event_type,
        event_version,
        occurred_at,
        received_at,
        source,
        household_id,
        actor_id,
        entity_type,
        entity_id,
        correlation_id,
        causation_id,
        payload,
        metadata
      ) VALUES(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb
      )`,
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
      return [];
    }

    return withTransaction(async (transaction) => {
      const result = await transaction.query<OutboxRow>(
        `WITH candidates AS (
          SELECT event_id
          FROM outbox_events
          WHERE published_at IS NULL
            AND available_at <= now()
            AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
          ORDER BY created_at, event_id
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE outbox_events AS outbox
        SET claimed_at = now()
        FROM candidates
        WHERE outbox.event_id = candidates.event_id
        RETURNING outbox.*`,
        [limit],
      );

      return result.rows.map(mapOutboxRow);
    });
  }

  async markPublished(eventId: EventId): Promise<void> {
    await this.database.query(
      `UPDATE outbox_events
       SET published_at = now(), claimed_at = NULL, last_error = NULL
       WHERE event_id = $1`,
      [eventId],
    );
  }
}
