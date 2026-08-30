import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import type { AuditRecord, AuditRepository } from '../../src/audit/audit-repository.js';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import type { Notification } from '../../src/notifications/notification.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';

const calendarRecord = {
  provider: 'test-calendar',
  externalId: 'football-1',
  title: 'Football',
  startsAt: '2026-09-01T18:30:00+03:00',
  endsAt: '2026-09-01T19:30:00+03:00',
  timezone: 'Asia/Nicosia',
  version: '1',
} as const;

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
  readonly sent: Notification[] = [];

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    this.sent.push(notification);
    return { provider: 'fake', receiptId: `receipt-${this.sent.length}` };
  }
}

class FailingDelivery implements NotificationDelivery {
  readonly attempts: Notification[] = [];

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    this.attempts.push(notification);
    throw new Error('delivery unavailable');
  }
}

async function buildTestApp(delivery: NotificationDelivery) {
  const notificationRepository = new MemoryNotificationRepository();
  const auditRepository = new MemoryAuditRepository();
  const app = await buildApp({
    databaseUrl: process.env.DATABASE_URL!,
    modelGateway: new UnavailableModelGateway(),
    clock: new FixedClock(new Date('2026-09-01T15:00:00Z')),
    calendarConnector: new FakeCalendarConnector([calendarRecord]),
    notificationRepository,
    notificationDelivery: delivery,
    auditRepository,
  });

  const migration = await readFile(
    resolve(process.cwd(), 'src/persistence/migrations/001_core.sql'),
    'utf8',
  );
  await app.database.query(migration);
  await app.database.query(
    'TRUNCATE outbox_events, calendar_events, external_references, people, households CASCADE',
  );

  const household = createHousehold({
    name: 'AGNES Home',
    timezone: 'Asia/Nicosia',
    locale: 'el-CY',
  });
  await app.householdRepository.saveHousehold(household);
  await app.householdRepository.savePerson(
    createPerson({
      householdId: household.id,
      displayName: 'Parent',
      role: 'adult',
      locale: 'el-CY',
      timezone: 'Asia/Nicosia',
    }),
  );

  return { app, household, notificationRepository, auditRepository };
}

describe('calendar to notification vertical slice', () => {
  it(
    'imports an event, detects departure risk, sends one suggestion, and records acknowledgement',
    async () => {
      const delivery = new SuccessfulDelivery();
      const { app, household, notificationRepository, auditRepository } =
        await buildTestApp(delivery);

      try {
        const imported = await app.syncCalendar(household.id);
        expect(imported[0]?.change).toBe('created');
        const correlationId = imported[0]?.domainEvent?.correlationId;
        expect(correlationId).toBeTruthy();

        await app.outboxWorker.runOnce(10);

        const context = await app.contextStore.get(household.id);
        expect(context?.upcomingEvents).toHaveLength(1);
        const event = context?.upcomingEvents[0];
        expect(event).toBeDefined();

        const result = await app.suggestDepartureIfRisk({
          householdId: household.id,
          eventStartsAt: event!.startsAt,
          travelMinutes: 25,
          bufferMinutes: 10,
          correlationId: correlationId!,
        });

        expect(result.situation?.type).toBe('LATE_DEPARTURE_RISK');
        expect(result.outcome).toBe('suggest');
        expect(delivery.sent).toHaveLength(1);

        const delivered = [...notificationRepository.items.values()];
        expect(delivered).toHaveLength(1);
        expect(delivered[0]?.state).toBe('delivered');
        expect(delivered[0]?.correlationId).toBe(correlationId);

        const acknowledged = await app.acknowledgeNotification(delivered[0]!.id);
        expect(acknowledged.state).toBe('acknowledged');
        expect(auditRepository.records).toHaveLength(1);
        expect(auditRepository.records[0]?.correlationId).toBe(correlationId);
      } finally {
        await app.close();
      }
    },
  );

  it(
    'does not create a second logical event or suggestion for an unchanged provider retry',
    async () => {
      const delivery = new SuccessfulDelivery();
      const { app, household, notificationRepository } = await buildTestApp(delivery);

      try {
        const first = await app.syncCalendar(household.id);
        await app.outboxWorker.runOnce(10);
        const firstEvent = (await app.contextStore.get(household.id))?.upcomingEvents[0];
        await app.suggestDepartureIfRisk({
          householdId: household.id,
          eventStartsAt: firstEvent!.startsAt,
          travelMinutes: 25,
          bufferMinutes: 10,
          correlationId: first[0]!.domainEvent!.correlationId!,
        });

        const retry = await app.syncCalendar(household.id);
        expect(retry[0]?.change).toBe('unchanged');
        expect(retry[0]?.domainEvent).toBeUndefined();
        await app.outboxWorker.runOnce(10);

        expect(delivery.sent).toHaveLength(1);
        expect(notificationRepository.items.size).toBe(1);
        expect((await app.contextStore.get(household.id))?.upcomingEvents).toHaveLength(1);
      } finally {
        await app.close();
      }
    },
  );

  it('keeps the notification failed when the delivery provider fails', async () => {
    const delivery = new FailingDelivery();
    const { app, household, notificationRepository } = await buildTestApp(delivery);

    try {
      const imported = await app.syncCalendar(household.id);
      await app.outboxWorker.runOnce(10);
      const event = (await app.contextStore.get(household.id))?.upcomingEvents[0];

      const result = await app.suggestDepartureIfRisk({
        householdId: household.id,
        eventStartsAt: event!.startsAt,
        travelMinutes: 25,
        bufferMinutes: 10,
        correlationId: imported[0]!.domainEvent!.correlationId!,
      });

      expect(delivery.attempts).toHaveLength(1);
      expect(result.notification?.state).toBe('failed');
      expect(result.notification?.deliveryReceipt).toBeUndefined();
      expect([...notificationRepository.items.values()]).toHaveLength(1);
      expect([...notificationRepository.items.values()][0]?.state).toBe('failed');
    } finally {
      await app.close();
    }
  });
});
