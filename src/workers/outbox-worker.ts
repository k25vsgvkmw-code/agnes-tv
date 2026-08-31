import type { DomainEventBus } from '../events/domain-event-bus.js';
import type { OutboxRepository } from '../events/outbox.js';

export class OutboxWorker {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly bus: DomainEventBus,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async runOnce(limit: number): Promise<number> {
    const records = await this.outbox.claimBatch(limit);

    for (const record of records) {
      try {
        await this.bus.publish(record.event);
        await this.outbox.markPublished(record.event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'outbox publication failed';
        const delayMs = Math.min(60 * 60_000, 2 ** Math.max(0, record.attempts - 1) * 60_000);
        const retryAt = new Date(this.now().getTime() + delayMs);
        await this.outbox.markFailed(record.event.id, message, retryAt);
      }
    }

    return records.length;
  }
}
