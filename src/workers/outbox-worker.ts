import type { DomainEventBus } from '../events/domain-event-bus.js';
import type { OutboxRepository } from '../events/outbox.js';
import type { Clock } from '../kernel/clock.js';
import { SystemClock } from '../kernel/clock.js';

export class OutboxWorker {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly bus: DomainEventBus,
    private readonly clock: Clock = new SystemClock(),
    private readonly retryBaseMs = 1_000,
  ) {}

  async runOnce(limit: number): Promise<void> {
    if (!Number.isInteger(limit) || limit <= 0) {
      return;
    }

    const records = await this.repository.claimBatch(limit);

    for (const record of records) {
      try {
        await this.bus.publish(record.event);
        await this.repository.markPublished(record.event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryDelayMs = this.retryBaseMs * 2 ** record.attempts;
        const availableAt = new Date(this.clock.now().getTime() + retryDelayMs);
        await this.repository.markFailed(record.event.id, message, availableAt);
      }
    }
  }
}
