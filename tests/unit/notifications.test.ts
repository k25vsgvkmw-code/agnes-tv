import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { AuditRecord, AuditRepository } from '../../src/audit/audit-repository.js';
import { acknowledgeNotification } from '../../src/notifications/acknowledge-notification.js';
import { createNotification } from '../../src/notifications/create-notification.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import type { Notification } from '../../src/notifications/notification.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { registerNotificationRoutes } from '../../src/transport/notification-routes.js';

class MemoryNotificationRepository implements NotificationRepository {
  readonly items = new Map<string, Notification>();

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id, notification);
  }

  async get(id: string): Promise<Notification | null> {
    return this.items.get(id) ?? null;
  }
}

class MemoryAuditRepository implements AuditRepository {
  readonly records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.records.push(record);
  }
}

class SuccessfulDelivery implements NotificationDelivery {
  readonly sentStates: string[] = [];

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    this.sentStates.push(notification.state);
    return { provider: 'fake', receiptId: 'receipt-1' };
  }
}

class FailingDelivery implements NotificationDelivery {
  async send(): Promise<NotificationDeliveryReceipt> {
    throw new Error('delivery unavailable');
  }
}

const clock = new FixedClock(new Date('2026-09-01T15:00:00Z'));

describe('notification lifecycle', () => {
  it('marks a notification delivered only after provider delivery returns a receipt', async () => {
    const repository = new MemoryNotificationRepository();
    const delivery = new SuccessfulDelivery();

    const notification = await createNotification(
      {
        householdId: newHouseholdId(),
        outcome: 'suggest',
        title: 'Ώρα να φύγεις',
        message: 'Υπάρχει κίνδυνος καθυστέρησης.',
        situationType: 'LATE_DEPARTURE_RISK',
        supportingFactors: [{ name: 'remaining_minutes', value: 30 }],
      },
      { repository, delivery, clock },
    );

    expect(delivery.sentStates).toEqual(['delivering']);
    expect(notification.state).toBe('delivered');
    expect(notification.deliveryReceipt?.receiptId).toBe('receipt-1');
    expect((await repository.get(notification.id))?.state).toBe('delivered');
  });

  it('marks delivery failed and never delivered when the provider does not return a receipt', async () => {
    const repository = new MemoryNotificationRepository();

    const notification = await createNotification(
      {
        householdId: newHouseholdId(),
        outcome: 'suggest',
        title: 'Ώρα να φύγεις',
        message: 'Υπάρχει κίνδυνος καθυστέρησης.',
        situationType: 'LATE_DEPARTURE_RISK',
        supportingFactors: [],
      },
      { repository, delivery: new FailingDelivery(), clock },
    );

    expect(notification.state).toBe('failed');
    expect(notification.deliveryReceipt).toBeUndefined();
    expect((await repository.get(notification.id))?.state).toBe('failed');
  });

  it('acknowledges a delivered notification and writes one audit record', async () => {
    const repository = new MemoryNotificationRepository();
    const auditRepository = new MemoryAuditRepository();
    const delivered = await createNotification(
      {
        householdId: newHouseholdId(),
        outcome: 'suggest',
        title: 'Ώρα να φύγεις',
        message: 'Υπάρχει κίνδυνος καθυστέρησης.',
        situationType: 'LATE_DEPARTURE_RISK',
        supportingFactors: [],
      },
      { repository, delivery: new SuccessfulDelivery(), clock },
    );

    const acknowledged = await acknowledgeNotification(delivered.id, {
      repository,
      auditRepository,
      clock,
    });

    expect(acknowledged.state).toBe('acknowledged');
    expect(auditRepository.records).toHaveLength(1);
    expect(auditRepository.records[0]?.entityId).toBe(delivered.id);
  });

  it('routes acknowledgement through the application use case', async () => {
    const app = Fastify();
    const calls: string[] = [];
    await registerNotificationRoutes(app, {
      acknowledge: async (id) => {
        calls.push(id);
        return { id, state: 'acknowledged' };
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/notifications/notification-1/acknowledge',
    });

    expect(response.statusCode).toBe(200);
    expect(calls).toEqual(['notification-1']);
  });
});
