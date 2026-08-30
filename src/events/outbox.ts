import type { AgnesEvent } from './agnes-event.js';
import type { EventId } from '../kernel/ids.js';

export interface OutboxRecord {
  readonly event: AgnesEvent;
  readonly attempts: number;
  readonly availableAt: Date;
  readonly claimedAt: Date | null;
  readonly publishedAt: Date | null;
  readonly lastError: string | null;
}

export interface OutboxRepository<TTransaction = unknown> {
  append(transaction: TTransaction, event: AgnesEvent): Promise<void>;
  claimBatch(limit: number): Promise<readonly OutboxRecord[]>;
  markPublished(eventId: EventId): Promise<void>;
}
