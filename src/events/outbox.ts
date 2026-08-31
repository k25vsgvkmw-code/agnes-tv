import type { PoolClient } from 'pg';
import type { EventId } from '../kernel/ids.js';
import type { AgnesEvent } from './agnes-event.js';

export interface OutboxRecord {
  readonly event: AgnesEvent;
  readonly publicationState: 'pending' | 'processing' | 'published';
  readonly attempts: number;
  readonly availableAt: Date;
  readonly publishedAt: Date | null;
  readonly lastError: string | null;
}

export interface OutboxRepository {
  append(tx: PoolClient, event: AgnesEvent): Promise<void>;
  claimBatch(limit: number): Promise<readonly OutboxRecord[]>;
  markPublished(id: EventId): Promise<void>;
  markFailed(id: EventId, error: string, retryAt: Date): Promise<void>;
}
