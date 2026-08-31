import { afterAll, describe, expect, it } from 'vitest';
import type { AuditRecord } from '../../src/audit/audit-record.js';
import type { AuditRepository } from '../../src/audit/audit-repository.js';
import { importCalendarRecord } from '../../src/calendar/import-calendar-event.js';
import { InMemoryContextStore } from '../../src/context/in-memory-context-store.js';
import { updateContextFromEvent } from '../../src/context/update-context-from-event.js';
import { decideSituation } from '../../src/decisions/decide-situation.js';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { acknowledgeNotification } from '../../src/notifications/acknowledge-notification.js';
import { createAndDeliverNotification } from '../../src/notifications/create-notification.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';
import type { Notification } from '../../src/notifications/notification.js';
import { evaluateCapability } from '../../src/permissions/policy-engine.js';
import { PostgresCalendarRepository } from '../../src/persistence/postgres-calendar-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { pool, withTransaction } from '../../src/persistence/postgres.js';
import { DepartureRiskDetector } from '../../src/situations/departure-risk-detector.js';
import { OutboxWorker } from '../../src/workers/outbox-worker.js';

class MemoryNotificationRepository implements NotificationRepository {
  readonly values = new Map<string, Notification>();

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

afterAll(async () => {
  await pool.end();
});

describe('calendar to notification vertical slice', () => {
  it('imports once, materializes context, detects risk, delivers, acknowledges and audits', async () => {
    const households = new PostgresHouseholdRepository(pool);
    const calendar = new PostgresCalendarRepository(pool);
    const outbox = new PostgresOutboxRepository(pool);
    const household = createHousehold({
      name: 'E2E Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });
    const person = createPerson({
      householdId: household.id,
      displayName: 'Parent',
      role: 'adult',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });
    await households.saveHousehold(household);
    await households.savePerson(person);

    const externalId = `evt-e2e-${household.id}`;
    const connector = new FakeCalendarConnector('test-calendar', [
      {
        provider: 'test-calendar',
        externalId,
        title: 'Football',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T19:30:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '1',
      },
    ]);
    await connector.connect();
    const delta = await connector.sync();
    const record = delta.records[0];
    expect(record).toBeDefined();
    if (!record) throw new Error('fake connector returned no record');

    const clock = new FixedClock(new Date('2026-09-01T15:00:00Z'));
    const importContext = {
      householdId: household.id,
      calendarRepository: calendar,
      outboxRepository: outbox,
      clock,
      transaction: withTransaction,
    };
    const first = await importCalendarRecord(record, importContext);
    const duplicate = await importCalendarRecord(record, importContext);
    expect(first.change).toBe('created');
    expect(duplicate.change).toBe('unchanged');

    const storedEvents = await pool.query<{ count: string }>(
      `select count(*)::text as count from outbox_events
       where household_id = $1 and event_type = 'calendar.event.created.v1'`,
      [household.id],
    );
    expect(storedEvents.rows[0]?.count).toBe('1');

    const store = new InMemoryContextStore(clock);
    const bus = new InMemoryDomainEventBus();
    bus.subscribe('calendar.event.created.v1', (event) => updateContextFromEvent(event, store));
    bus.subscribe('calendar.event.updated.v1', (event) => updateContextFromEvent(event, store));
    const worker = new OutboxWorker(outbox, bus, () => clock.now());
    await worker.runOnce(10);

    const context = await store.get(household.id);
    expect(context.upcomingEvents.map((event) => event.id)).toContain(first.event.id);

    const detector = new DepartureRiskDetector();
    const situations = detector.detect({
      now: new Date('2026-09-01T15:00:00Z'),
      eventStartsAt: first.event.startsAt,
      travelMinutes: 25,
      bufferMinutes: 10,
      eventId: first.event.id,
    });
    expect(situations[0]?.type).toBe('LATE_DEPARTURE_RISK');

    const policy = evaluateCapability({
      capability: 'notifications',
      requested: 'suggest',
      grant: { view: true, suggest: true, act: false },
    });
    expect(policy.allowed).toBe(true);
    expect(
      decideSituation({
        score: 0.6,
        urgency: 0.9,
        attentionState: 'available',
        policyAllowsAct: false,
      }),
    ).toBe('suggest');

    const notifications = new MemoryNotificationRepository();
    const audit = new MemoryAuditRepository();
    const correlationId = `calendar:test-calendar:${externalId}`;
    const delivery: NotificationDelivery = {
      send(): Promise<NotificationDeliveryReceipt> {
        return Promise.resolve({
          provider: 'fake-notifier',
          receiptId: 'receipt-e2e-1',
          deliveredAt: new Date('2026-09-01T15:00:02Z'),
        });
      },
    };
    const candidate = {
      id: 'notification-e2e-1',
      householdId: household.id,
      type: 'departure_risk',
      title: 'Time to leave',
      body: 'Leave now to arrive on time.',
      correlationId,
      supportingFactors: situations[0]?.supportingFactors ?? {},
    };
    const delivered = await createAndDeliverNotification(candidate, {
      repository: notifications,
      delivery,
      now: () => new Date('2026-09-01T15:00:01Z'),
    });
    expect(delivered.ok).toBe(true);
    expect(
      [...notifications.values.values()].filter((item) => item.state === 'delivered'),
    ).toHaveLength(1);

    await acknowledgeNotification(candidate.id, {
      repository: notifications,
      auditRepository: audit,
      now: () => new Date('2026-09-01T15:02:00Z'),
    });
    expect(await notifications.get(candidate.id)).toMatchObject({ state: 'acknowledged' });
    expect(audit.values).toHaveLength(1);
    expect(audit.values[0]?.correlationId).toBe(correlationId);

    await connector.disconnect();
  });

  it('never reports delivery success when the provider fails', async () => {
    const notifications = new MemoryNotificationRepository();
    const delivery: NotificationDelivery = {
      send(): Promise<NotificationDeliveryReceipt> {
        return Promise.reject(new Error('notification provider unavailable'));
      },
    };

    const result = await createAndDeliverNotification(
      {
        id: 'notification-e2e-failure',
        householdId: 'household-e2e-failure',
        type: 'departure_risk',
        title: 'Time to leave',
        body: 'Leave now.',
        correlationId: 'calendar:test-calendar:failure',
        supportingFactors: {},
      },
      {
        repository: notifications,
        delivery,
        now: () => new Date('2026-09-01T15:00:00Z'),
      },
    );

    expect(result.ok).toBe(false);
    expect(await notifications.get('notification-e2e-failure')).toMatchObject({
      state: 'failed',
      deliveredAt: null,
    });
  });
});
