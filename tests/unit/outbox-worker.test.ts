import { describe, expect, it } from 'vitest';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import type { DomainEventBus } from '../../src/events/domain-event-bus.js';
import type { OutboxRecord, OutboxRepository } from '../../src/events/outbox.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { EventId } from '../../src/kernel/ids.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { OutboxWorker } from '../../src/workers/outbox-worker.js';

interface FailedRecord {
  readonly eventId: EventId;
  readonly error: string;
  readonly availableAt: Date;
}

class FakeOutboxRepository implements OutboxRepository {
  readonly published: EventId[] = [];
  readonly failed: FailedRecord[] = [];

  constructor(
    private readonly records: readonly OutboxRecord[],
    private readonly sequence: string[],
  ) {}

  async append(): Promise<void> {}

  async claimBatch(limit: number): Promise<readonly OutboxRecord[]> {
    return this.records.slice(0, limit);
  }

  async markPublished(eventId: EventId): Promise<void> {
    this.sequence.push('markPublished');
    this.published.push(eventId);
  }

  async markFailed(eventId: EventId, error: string, availableAt: Date): Promise<void> {
    this.sequence.push('markFailed');
    this.failed.push({ eventId, error, availableAt: new Date(availableAt) });
  }
}

function createRecord(attempts = 0): OutboxRecord {
  const event = createAgnesEvent({
    type: 'calendar.event.created.v1',
    version: 1,
    occurredAt: new Date('2026-09-01T14:59:00Z'),
    receivedAt: new Date('2026-09-01T14:59:01Z'),
    source: 'test-calendar',
    householdId: newHouseholdId(),
    payload: {},
    metadata: {},
  });

  return {
    event,
    attempts,
    availableAt: new Date('2026-09-01T14:59:00Z'),
    claimedAt: new Date('2026-09-01T15:00:00Z'),
    publishedAt: null,
    lastError: null,
  };
}

describe('outbox worker', () => {
  it('marks an event published only after the bus accepts it', async () => {
    const sequence: string[] = [];
    const record = createRecord();
    const repository = new FakeOutboxRepository([record], sequence);
    const bus: DomainEventBus = {
      async publish(): Promise<void> {
        sequence.push('publish');
      },
      subscribe: () => () => {},
    };
    const worker = new OutboxWorker(
      repository,
      bus,
      new FixedClock(new Date('2026-09-01T15:00:00Z')),
    );

    await worker.runOnce(10);

    expect(sequence).toEqual(['publish', 'markPublished']);
    expect(repository.published).toEqual([record.event.id]);
    expect(repository.failed).toEqual([]);
  });

  it('records failure and schedules exponential retry without marking published', async () => {
    const sequence: string[] = [];
    const record = createRecord(2);
    const repository = new FakeOutboxRepository([record], sequence);
    const bus: DomainEventBus = {
      async publish(): Promise<void> {
        sequence.push('publish');
        throw new Error('temporary bus failure');
      },
      subscribe: () => () => {},
    };
    const worker = new OutboxWorker(
      repository,
      bus,
      new FixedClock(new Date('2026-09-01T15:00:00Z')),
      1_000,
    );

    await worker.runOnce(10);

    expect(sequence).toEqual(['publish', 'markFailed']);
    expect(repository.published).toEqual([]);
    expect(repository.failed).toHaveLength(1);
    expect(repository.failed[0]).toMatchObject({
      eventId: record.event.id,
      error: 'temporary bus failure',
    });
    expect(repository.failed[0]?.availableAt.toISOString()).toBe('2026-09-01T15:00:04.000Z');
  });
});
