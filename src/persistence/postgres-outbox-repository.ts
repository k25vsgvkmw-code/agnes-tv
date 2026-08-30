import type { Pool, PoolClient } from 'pg';
import type { AgnesEvent } from '../events/agnes-event.js';
import type { OutboxRecord, OutboxRepository } from '../events/outbox.js';
import type { EventId } from '../kernel/ids.js';

type Queryable = Pool | PoolClient;

interface OutboxRow {
  event_payload: Record<string, unknown>;
  created_at: Date;
  published_at: Date | null;
  attempts: number;
  next_attempt_at: Date | null;
  last_error: string | null;
}

function hydrateEvent(payload: Record<string, unknown>): AgnesEvent {
  return {
    ...payload,
    occurredAt: new Date(String(payload.occurredAt)),
    receivedAt: new Date(String(payload.receivedAt)),
  } as unknown as AgnesEvent;
}

function hydrateRecord(row: OutboxRow): OutboxRecord {
  return {
    event: hydrateEvent(row.event_payload),
    createdAt: new Date(row.created_at),
    publishedAt: row.published_at === null ? null : new Date(row.published_at),
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at === null ? null : new Date(row.next_attempt_at),
    lastError: row.last_error,
  };
}

export class PostgresOutboxRepository implements OutboxRepository {
  constructor(private readonly pool: Pool) {}

  async append(event: AgnesEvent, client?: PoolClient): Promise<void> {
    const executor: Queryable = client ?? this.pool;
    await executor.query(
      `INSERT INTO outbox_events (event_id, event_type, event_version, event_payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.id, event.type, event.version, JSON.stringify(event)],
    );
  }

  async get(eventId: EventId): Promise<OutboxRecord | null> {
    const result = await this.pool.query<OutboxRow>(
      `SELECT event_payload, created_at, published_at, attempts, next_attempt_at, last_error
       FROM outbox_events
       WHERE event_id = $1`,
      [eventId],
    );
    const row = result.rows[0];
    return row === undefined ? null : hydrateRecord(row);
  }

  async claimPending(limit: number, now: Date): Promise<readonly OutboxRecord[]> {
    const result = await this.pool.query<OutboxRow>(
      `SELECT event_payload, created_at, published_at, attempts, next_attempt_at, last_error
       FROM outbox_events
       WHERE published_at IS NULL
         AND (next_attempt_at IS NULL OR next_attempt_at <= $1)
       ORDER BY created_at ASC
       LIMIT $2`,
      [now, limit],
    );
    return result.rows.map(hydrateRecord);
  }

  async markPublished(eventId: EventId, publishedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_events
       SET published_at = $2, last_error = NULL, next_attempt_at = NULL
       WHERE event_id = $1`,
      [eventId, publishedAt],
    );
  }

  async markFailed(eventId: EventId, error: string, nextAttemptAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_events
       SET attempts = attempts + 1, last_error = $2, next_attempt_at = $3
       WHERE event_id = $1`,
      [eventId, error, nextAttemptAt],
    );
  }
}
