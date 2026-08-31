import { describe, expect, it } from 'vitest';
import {
  type Notification,
  type NotificationCandidate,
} from '../../src/notifications/notification.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import { createAndDeliverNotification } from '../../src/notifications/create-notification.js';
import { acknowledgeNotification } from '../../src/notifications/acknowledge-notification.js';
import type { AuditRecord } from '../../src/audit/audit-record.js';
import type { AuditRepository } from '../../src/audit/audit-repository.js';

class MemoryNotificationRepository implements NotificationRepository {
  private readonly values = new Map<string, Notification>();

  save(notification: Notification): Promise<void> {
    this.values.set(notification.id, notification);
    return Promise.resolve();
  }

  get(id: string): Promise<Notification | null> {
    return Promise.resolve(this.values.get(id) ?? null);
  }
}

class MemoryAuditRepository implements AuditRepository {
  readonly values: AuditRecord[] = [];

  append(record: AuditRecord): Promise<void> {
    this.values.push(record);
    return Promise.resolve();
  }
}

const candidate: NotificationCandidate = {
  id: 'notification-1',
  householdId: 'household-1',
  type: 'departure_risk',
  title: 'Time to leave',
  body: 'Leave now to arrive on time.',
  correlationId: 'calendar:test:evt-1',
  supportingFactors: { remainingMinutes: 30, travelMinutes: 25, bufferMinutes: 10 },
};

describe('notification lifecycle', () => {
  it('does not mark notification delivered when provider delivery fails', async () => {
    const repository = new MemoryNotificationRepository();
    const delivery: NotificationDelivery = {
      send(): Promise<NotificationDeliveryReceipt> {
        return Promise.reject(new Error('provider down'));
      },
    };

    const result = await createAndDeliverNotification(candidate, {
      repository,
      delivery,
      now: () => new Date('2026-09-01T15:00:00Z'),
    });

    expect(result.ok).toBe(false);
    expect(await repository.get(candidate.id)).toMatchObject({ state: 'failed' });
  });

  it('acknowledges a delivered notification and writes one audit record', async () => {
    const repository = new MemoryNotificationRepository();
    const audit = new MemoryAuditRepository();
    const delivery: NotificationDelivery = {
      send(): Promise<NotificationDeliveryReceipt> {
        return Promise.resolve({
          provider: 'fake',
          receiptId: 'receipt-1',
          deliveredAt: new Date('2026-09-01T15:00:01Z'),
        });
      },
    };

    const created = await createAndDeliverNotification(candidate, {
      repository,
      delivery,
      now: () => new Date('2026-09-01T15:00:00Z'),
    });
    expect(created.ok).toBe(true);
    expect(await repository.get(candidate.id)).toMatchObject({ state: 'delivered' });

    await acknowledgeNotification(candidate.id, {
      repository,
      auditRepository: audit,
      now: () => new Date('2026-09-01T15:02:00Z'),
    });

    expect(await repository.get(candidate.id)).toMatchObject({ state: 'acknowledged' });
    expect(audit.values).toHaveLength(1);
    expect(audit.values[0]?.correlationId).toBe(candidate.correlationId);
  });
});
