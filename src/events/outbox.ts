import type { PoolClient } from 'pg';
import type { AgnesEvent } from './agnes-event.js';
import type { EventId } from '../kernel/ids.js';

export interface OutboxRecord {
  readonly event: AgnesEvent;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
  readonly attempts: number;
  readonly nextAttemptAt: Date | null;
  readonly lastError: string | null;
}

export interface OutboxRepository {
  append(event: AgnesEvent, client?: PoolClient): Promise<void>;
  get(eventId: EventId): Promise<OutboxRecord | null>;
  claimPending(limit: number, now: Date): Promise<readonly OutboxRecord[]>;
  markPublished(eventId: EventId, publishedAt: Date): Promise<void>;
  markFailed(eventId: EventId, error: string, nextAttemptAt: Date): Promise<void>;
}
