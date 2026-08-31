import { describe, expect, it } from 'vitest';
import type { AgnesEvent } from '../../src/events/agnes-event.js';
import type { DomainEventBus } from '../../src/events/domain-event-bus.js';
import type { OutboxRecord, OutboxRepository } from '../../src/events/outbox.js';
import type { EventId } from '../../src/kernel/ids.js';
import { OutboxWorker } from '../../src/workers/outbox-worker.js';

class MemoryOutbox implements OutboxRepository {
  record: OutboxRecord;

  constructor(event: AgnesEvent) {
    this.record = {
      event,
      publicationState: 'pending',
      attempts: 0,
      availableAt: new Date('2026-09-01T15:00:00Z'),
      publishedAt: null,
      lastError: null,
    };
  }

  append(): Promise<void> {
    return Promise.resolve();
  }

  claimBatch(): Promise<readonly OutboxRecord[]> {
    if (this.record.publicationState !== 'pending') return Promise.resolve([]);
    this.record = {
      ...this.record,
      publicationState: 'processing',
      attempts: this.record.attempts + 1,
    };
    return Promise.resolve([this.record]);
  }

  markPublished(): Promise<void> {
    this.record = {
      ...this.record,
      publicationState: 'published',
      publishedAt: new Date('2026-09-01T15:01:00Z'),
    };
    return Promise.resolve();
  }

  markFailed(_id: EventId, error: string, retryAt: Date): Promise<void> {
    this.record = {
      ...this.record,
      publicationState: 'pending',
      availableAt: retryAt,
      lastError: error,
    };
    return Promise.resolve();
  }
}

describe('OutboxWorker', () => {
  it('retries a failed publication and marks published only after bus success', async () => {
    const event = {
      id: 'event-1',
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:00:00Z'),
      receivedAt: new Date('2026-09-01T15:00:00Z'),
      source: 'test',
      householdId: 'household-1',
      payload: {},
      metadata: {},
    } as AgnesEvent;
    const outbox = new MemoryOutbox(event);
    let calls = 0;
    const bus: DomainEventBus = {
      publish(): Promise<void> {
        calls += 1;
        return calls === 1 ? Promise.reject(new Error('temporary failure')) : Promise.resolve();
      },
      subscribe() {
        return () => undefined;
      },
    };
    let now = new Date('2026-09-01T15:00:00Z');
    const worker = new OutboxWorker(outbox, bus, () => now);

    await worker.runOnce(10);
    expect(outbox.record.publicationState).toBe('pending');
    expect(outbox.record.attempts).toBe(1);
    expect(outbox.record.lastError).toBe('temporary failure');
    expect(outbox.record.publishedAt).toBeNull();

    now = new Date('2026-09-01T15:10:00Z');
    await worker.runOnce(10);
    expect(outbox.record.publicationState).toBe('published');
    expect(outbox.record.publishedAt).not.toBeNull();
  });
});
