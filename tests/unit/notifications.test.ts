import { describe, expect, it, vi } from 'vitest';
import type { AuditRecord, AuditRepository } from '../../src/audit/audit-record.js';
import { acknowledgeNotification } from '../../src/notifications/acknowledge-notification.js';
import { createAndDeliverNotification } from '../../src/notifications/create-notification.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import { InMemoryNotificationRepository } from '../../src/notifications/notification-repository.js';
import type { HouseholdId, NotificationId } from '../../src/kernel/ids.js';

const householdId = '85000000-0000-4000-8000-000000000001' as HouseholdId;
const notificationId = '85000000-0000-4000-8000-000000000002' as NotificationId;
const now = new Date('2026-09-01T15:00:00Z');

function candidate() {
  return {
    id: notificationId,
    householdId,
    title: 'Leave soon',
    message: 'Leave in the next 5 minutes to arrive on time.',
    priority: 'high' as const,
    correlationId: 'corr-departure-1',
    supportingFactors: {
      eventStartsAt: '2026-09-01T15:30:00.000Z',
      travelMinutes: 25,
      bufferMinutes: 10,
      remainingMinutes: 30,
    },
  };
}

class InMemoryAuditRepository implements AuditRepository {
  readonly records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.records.push(record);
  }
}

function deliveryMock(): NotificationDelivery & {
  send: ReturnType<typeof vi.fn<(notificationId: NotificationId) => Promise<NotificationDeliveryReceipt>>>;
} {
  return {
    send: vi.fn<(notificationId: NotificationId) => Promise<NotificationDeliveryReceipt>>(),
  };
}

describe('notification lifecycle', () => {
  it('does not mark a notification delivered when provider delivery fails', async () => {
    const repository = new InMemoryNotificationRepository();
    const delivery = deliveryMock();
    delivery.send.mockRejectedValue(new Error('provider down'));

    const result = await createAndDeliverNotification(candidate(), {
      repository,
      delivery,
      now: () => now,
    });

    expect(result.ok).toBe(false);
    expect(await repository.get(notificationId)).toMatchObject({ state: 'failed' });
  });

  it('marks a notification delivered only after the provider returns a receipt', async () => {
    const repository = new InMemoryNotificationRepository();
    const delivery = deliveryMock();
    delivery.send.mockResolvedValue({
      provider: 'fake-push',
      receiptId: 'receipt-1',
      deliveredAt: now,
    });

    const result = await createAndDeliverNotification(candidate(), {
      repository,
      delivery,
      now: () => now,
    });

    expect(result.ok).toBe(true);
    expect(await repository.get(notificationId)).toMatchObject({
      state: 'delivered',
      deliveryReceipt: {
        provider: 'fake-push',
        receiptId: 'receipt-1',
      },
    });
  });

  it('acknowledges a delivered notification and writes exactly one audit record', async () => {
    const repository = new InMemoryNotificationRepository();
    const auditRepository = new InMemoryAuditRepository();
    const delivery = deliveryMock();
    delivery.send.mockResolvedValue({
      provider: 'fake-push',
      receiptId: 'receipt-1',
      deliveredAt: now,
    });

    await createAndDeliverNotification(candidate(), {
      repository,
      delivery,
      now: () => now,
    });
    const result = await acknowledgeNotification(notificationId, {
      repository,
      auditRepository,
      now: () => new Date('2026-09-01T15:01:00Z'),
      actorId: 'person-1',
    });

    expect(result.state).toBe('acknowledged');
    expect(await repository.get(notificationId)).toMatchObject({ state: 'acknowledged' });
    expect(auditRepository.records).toHaveLength(1);
    expect(auditRepository.records[0]).toMatchObject({
      action: 'notification.acknowledged',
      outcome: 'success',
      entityType: 'notification',
      entityId: notificationId,
      correlationId: 'corr-departure-1',
    });
  });
});
