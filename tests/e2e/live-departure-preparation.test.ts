import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import type { AuditRecord, AuditRepository } from '../../src/audit/audit-repository.js';
import { createDevice } from '../../src/devices/device.js';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { FakeLocationSignalPort } from '../../src/location/fake-location-signal-port.js';
import { createNotification } from '../../src/notifications/create-notification.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import type { Notification } from '../../src/notifications/notification.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';
import { routeNotification } from '../../src/notifications/channel-router.js';
import { FakeRoutingPort } from '../../src/routing/fake-routing-port.js';
import { createTravelCondition } from '../../src/routing/travel-condition.js';
import { shouldSuppressByCooldown } from '../../src/situations/cooldown-policy.js';
import { hasMaterialDepartureChange } from '../../src/situations/material-change.js';
import { registerDeviceAgentRoutes } from '../../src/transport/device-agent-routes.js';
import { FakeWeatherPort } from '../../src/weather/fake-weather-port.js';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';

const now = new Date('2026-09-01T15:00:00Z');
const calendarRecord = {
  provider: 'test-calendar',
  externalId: 'live-training-1',
  title: 'Προπόνηση',
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

class FakePushDelivery implements NotificationDelivery {
  readonly sent: Notification[] = [];

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    this.sent.push(notification);
    return { provider: 'fake-push', receiptId: `push-${this.sent.length}` };
  }
}

function signatureFor(
  deviceId: string,
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'],
  timestamp: Date,
  rawBody: string,
): string {
  const bodyHash = createHash('sha256').update(Buffer.from(rawBody, 'utf8')).digest('hex');
  const signedBytes = Buffer.from(`${deviceId}\n${timestamp.toISOString()}\n${bodyHash}`, 'utf8');
  return sign(null, signedBytes, privateKey).toString('base64');
}

async function migrate(app: Awaited<ReturnType<typeof buildApp>>): Promise<void> {
  for (const migrationPath of [
    'src/persistence/migrations/001_core.sql',
    'src/persistence/migrations/002_live_core.sql',
  ]) {
    const migration = await readFile(resolve(process.cwd(), migrationPath), 'utf8');
    await app.database.query(migration);
  }
  await app.database.query(
    'TRUNCATE offline_commands, device_push_tokens, devices, outbox_events, calendar_events, external_references, people, households CASCADE',
  );
}

describe('Live v2 departure preparation end-to-end', () => {
  it('turns signed HOME presence, calendar, rain, and traffic into one verified and acknowledged push', async () => {
    const household = createHousehold({
      name: 'AGNES Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });
    const person = createPerson({
      householdId: household.id,
      displayName: 'Parent',
      role: 'adult',
      locale: 'el-CY',
      timezone: 'Asia/Nicosia',
    });
    const weatherPort = new FakeWeatherPort(
      createWeatherSnapshot({
        householdId: household.id,
        placeId: 'home',
        observedAt: now,
        expiresAt: new Date('2026-09-01T15:20:00Z'),
        temperatureC: 28,
        feelsLikeC: 29,
        condition: 'rain',
        rainProbability: 0.8,
        precipitationMm: 2,
        windSpeedKmh: 15,
        windGustKmh: 25,
        humidity: 70,
        visibilityKm: 10,
        uvIndex: 2,
        source: 'fake-weather',
        confidence: 0.9,
      }),
    );
    const routingPort = new FakeRoutingPort(
      createTravelCondition({
        observedAt: now,
        expiresAt: new Date('2026-09-01T15:05:00Z'),
        durationMinutes: 25,
        distanceKm: 12,
        trafficDelayMinutes: 7,
        source: 'fake-routing',
        confidence: 0.94,
      }),
    );
    const locationSignalPort = new FakeLocationSignalPort();
    const notificationRepository = new MemoryNotificationRepository();
    const auditRepository = new MemoryAuditRepository();
    const pushDelivery = new FakePushDelivery();
    const app = await buildApp({
      databaseUrl: process.env.DATABASE_URL!,
      modelGateway: new UnavailableModelGateway(),
      clock: new FixedClock(now),
      calendarConnector: new FakeCalendarConnector([calendarRecord]),
      weatherPort,
      locationSignalPort,
      routingPort,
      notificationRepository,
      notificationDelivery: pushDelivery,
      auditRepository,
    });

    try {
      await migrate(app);
      await app.householdRepository.saveHousehold(household);
      await app.householdRepository.savePerson(person);

      const { publicKey, privateKey } = generateKeyPairSync('ed25519');
      const phone = createDevice({
        householdId: household.id,
        ownerPersonId: person.id,
        deviceType: 'PHONE',
        platform: 'IOS',
        capabilities: ['LOCATION', 'MOBILE_PUSH'],
        trustLevel: 'HIGH_TRUST',
        connectionState: 'ONLINE',
        agentVersion: '2.0.0',
        publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        lastSeenAt: new Date('2026-09-01T14:59:00Z'),
        registeredAt: new Date('2026-09-01T14:00:00Z'),
      });
      await app.deviceRepository.save(phone);

      const imported = await app.syncCalendar(household.id);
      const correlationId = imported[0]?.domainEvent?.correlationId;
      expect(correlationId).toBeTruthy();
      await app.outboxWorker.runOnce(10);

      const routeApp = Fastify();
      await registerDeviceAgentRoutes(routeApp, {
        deviceRepository: app.deviceRepository,
        now: () => now,
        async ingestLocationSignal(signal) {
          await app.ingestLocationSignal({
            householdId: household.id,
            personId: person.id,
            signal,
            correlationId: correlationId!,
          });
        },
      });

      const signedAt = new Date('2026-09-01T14:59:00Z');
      const locationBody = JSON.stringify({
        semanticPlace: 'HOME',
        latitude: 34.92,
        longitude: 33.62,
        observedAt: '2026-09-01T14:59:30.000Z',
        expiresAt: '2026-09-01T15:09:30.000Z',
        movementState: 'STATIONARY',
        source: 'DEVICE_GEOFENCE',
        privacyScope: 'HOUSEHOLD',
      });
      const locationResponse = await routeApp.inject({
        method: 'POST',
        url: '/live/device/signals/location',
        headers: {
          'content-type': 'application/json',
          'x-agnes-device-id': phone.id,
          'x-agnes-timestamp': signedAt.toISOString(),
          'x-agnes-signature': signatureFor(phone.id, privateKey, signedAt, locationBody),
        },
        payload: locationBody,
      });
      expect(locationResponse.statusCode).toBe(202);
      await routeApp.close();

      await app.syncWeather({
        householdId: household.id,
        placeId: 'home',
        point: { latitude: 34.92, longitude: 33.62 },
        now,
        correlationId: correlationId!,
      });
      await app.refreshRoute({
        householdId: household.id,
        request: {
          origin: { latitude: 34.92, longitude: 33.62 },
          destination: { latitude: 34.91, longitude: 33.59 },
          mode: 'DRIVE',
          departureAt: now,
        },
        correlationId: correlationId!,
      });

      const context = await app.contextStore.get(household.id);
      expect(context?.presenceByPerson[person.id]?.state).toBe('PRESENT');
      expect(context?.currentWeather?.rainProbability).toBe(0.8);
      expect(context?.travelConditions?.trafficDelayMinutes).toBe(7);
      expect(context?.upcomingEvents).toHaveLength(1);

      const first = await app.evaluateDeparturePreparation({
        householdId: household.id,
        targetPersonId: person.id,
        departureBufferMinutes: 10,
        correlationId: correlationId!,
      });
      expect(first).not.toBeNull();
      expect(first?.message).toBe('Φύγετε περίπου 35 λεπτά νωρίτερα· αναμένεται βροχή.');
      expect(first?.situation.type).toBe('DEPARTURE_PREPARATION');
      expect(first?.candidate.situationFingerprint).toBe(first?.situation.fingerprint);

      const reachable = await app.deviceRepository.listReachable(household.id);
      const route = routeNotification({
        candidate: first!.candidate,
        targetPresence: context!.presenceByPerson[person.id]!.state,
        attention: 'AVAILABLE',
        reachableDevices: reachable,
      });
      expect(route).toEqual({ channel: 'MOBILE_PUSH', deviceId: phone.id });

      const delivered = await createNotification(
        {
          householdId: household.id,
          outcome: 'suggest',
          title: first!.candidate.title,
          message: first!.candidate.message,
          situationType: first!.situation.type,
          supportingFactors: first!.situation.supportingFactors,
          correlationId: correlationId!,
        },
        {
          repository: notificationRepository,
          delivery: pushDelivery,
          clock: new FixedClock(now),
        },
      );
      expect(delivered.state).toBe('delivered');
      expect(delivered.deliveryReceipt).toEqual({ provider: 'fake-push', receiptId: 'push-1' });
      expect(pushDelivery.sent).toHaveLength(1);

      const acknowledged = await app.acknowledgeNotification(delivered.id);
      expect(acknowledged.state).toBe('acknowledged');
      expect(auditRepository.records).toHaveLength(1);
      expect(auditRepository.records[0]?.correlationId).toBe(correlationId);

      const repeated = await app.evaluateDeparturePreparation({
        householdId: household.id,
        targetPersonId: person.id,
        departureBufferMinutes: 10,
        correlationId: correlationId!,
      });
      expect(repeated).not.toBeNull();
      expect(repeated?.situation.id).toBe(first?.situation.id);
      expect(repeated?.situation.fingerprint).toBe(first?.situation.fingerprint);

      const firstSnapshot = {
        urgency: first!.urgency,
        ...(first!.requiredDepartureAt === undefined
          ? {}
          : { requiredDepartureAt: first!.requiredDepartureAt }),
      };
      const repeatedSnapshot = {
        urgency: repeated!.urgency,
        ...(repeated!.requiredDepartureAt === undefined
          ? {}
          : { requiredDepartureAt: repeated!.requiredDepartureAt }),
      };
      const materialChange = hasMaterialDepartureChange(firstSnapshot, repeatedSnapshot);
      const suppressed = shouldSuppressByCooldown({
        lastEmittedAt: delivered.createdAt,
        now,
        materialChange,
      });
      expect(materialChange).toBe(false);
      expect(suppressed).toBe(true);
      expect(pushDelivery.sent).toHaveLength(1);
      expect(notificationRepository.items.size).toBe(1);
      await expect(
        app.activeSituationStore.getByFingerprint(first!.situation.fingerprint),
      ).resolves.toMatchObject({ id: first!.situation.id });
    } finally {
      await app.close();
    }
  });
});
