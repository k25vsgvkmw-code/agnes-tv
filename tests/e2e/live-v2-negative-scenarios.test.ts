import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { createCalendarEvent, createExternalReference } from '../../src/calendar/calendar-event.js';
import { createDevice, type Device } from '../../src/devices/device.js';
import type { DeviceRepository } from '../../src/devices/device-repository.js';
import {
  createOfflineCommand,
  processOfflineCommand,
  type OfflineCommand,
  type OfflineCommandExecutor,
} from '../../src/devices/offline-command.js';
import type { OfflineCommandRepository } from '../../src/devices/offline-command-repository.js';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';
import { UnavailableModelGateway } from '../../src/intelligence/unavailable-model-gateway.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { newHouseholdId, newPersonId } from '../../src/kernel/ids.js';
import { createNotification } from '../../src/notifications/create-notification.js';
import { routeNotification } from '../../src/notifications/channel-router.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from '../../src/notifications/notification-delivery.js';
import type { Notification } from '../../src/notifications/notification.js';
import type { NotificationCandidate } from '../../src/notifications/notification-candidate.js';
import type { NotificationRepository } from '../../src/notifications/notification-repository.js';
import { evaluateLivePolicy } from '../../src/permissions/live-policy-engine.js';
import { resolvePresence } from '../../src/presence/presence-resolver.js';
import type { PresenceState } from '../../src/presence/presence-state.js';
import { createTravelCondition } from '../../src/routing/travel-condition.js';
import { bundleDeparturePreparation } from '../../src/situations/departure-preparation-bundler.js';
import { InMemoryActiveSituationStore } from '../../src/situations/in-memory-active-situation-store.js';
import { hasMaterialDepartureChange } from '../../src/situations/material-change.js';
import { shouldSuppressByCooldown } from '../../src/situations/cooldown-policy.js';
import { registerDeviceAgentRoutes } from '../../src/transport/device-agent-routes.js';
import { createWeatherSnapshot } from '../../src/weather/weather-snapshot.js';

const now = new Date('2026-09-01T15:00:00Z');
const householdId = newHouseholdId();
const personId = newPersonId();

function event() {
  return createCalendarEvent({
    householdId,
    title: 'Προπόνηση',
    startsAt: new Date('2026-09-01T15:30:00Z'),
    endsAt: new Date('2026-09-01T16:30:00Z'),
    timezone: 'Asia/Nicosia',
    externalReference: createExternalReference({
      provider: 'negative-test-calendar',
      externalId: 'negative-training-1',
      lastSyncedAt: new Date('2026-09-01T14:50:00Z'),
      authoritative: true,
    }),
  });
}

function present(expiresAt = new Date('2026-09-01T15:10:00Z')): PresenceState {
  return {
    state: 'PRESENT',
    confidence: 0.95,
    sources: ['LOCATION'],
    expiresAt,
  };
}

function route(durationMinutes = 25) {
  return createTravelCondition({
    observedAt: new Date('2026-09-01T14:59:00Z'),
    expiresAt: new Date('2026-09-01T15:10:00Z'),
    durationMinutes,
    distanceKm: 12,
    trafficDelayMinutes: 7,
    source: 'negative-test-routing',
    confidence: 0.94,
  });
}

function weather(expiresAt = new Date('2026-09-01T15:10:00Z')) {
  return createWeatherSnapshot({
    householdId,
    placeId: 'home',
    observedAt: new Date('2026-09-01T14:55:00Z'),
    expiresAt,
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
    source: 'negative-test-weather',
    confidence: 0.9,
  });
}

function personalDevice(input: { revokedAt?: Date; trustLevel?: Device['trustLevel'] } = {}): Device {
  const { publicKey } = generateKeyPairSync('ed25519');
  return createDevice({
    householdId,
    ownerPersonId: personId,
    deviceType: 'PHONE',
    platform: 'IOS',
    capabilities: ['MOBILE_PUSH', 'LOCATION', 'shopping.list.modify'],
    trustLevel: input.trustLevel ?? 'TRUSTED',
    connectionState: input.revokedAt === undefined ? 'ONLINE' : 'OFFLINE',
    agentVersion: '2.0.0',
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    lastSeenAt: new Date('2026-09-01T14:59:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
    ...(input.revokedAt === undefined ? {} : { revokedAt: input.revokedAt }),
  });
}

function sharedDevice(): Device {
  return createDevice({
    householdId,
    deviceType: 'HOME_PANEL',
    platform: 'ANDROID',
    capabilities: ['TABLET_ALERT', 'VOICE_HOME'],
    trustLevel: 'UNTRUSTED',
    connectionState: 'ONLINE',
    agentVersion: '2.0.0',
    publicKeyPem: 'shared-test-key',
    lastSeenAt: now,
    registeredAt: new Date('2026-09-01T14:00:00Z'),
  });
}

class MemoryNotificationRepository implements NotificationRepository {
  readonly items = new Map<string, Notification>();

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id, notification);
  }

  async get(id: string): Promise<Notification | null> {
    return this.items.get(id) ?? null;
  }
}

class FailingDelivery implements NotificationDelivery {
  readonly attempts: Notification[] = [];

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    this.attempts.push(notification);
    throw new Error('provider unavailable');
  }
}

class MemoryCommandRepository implements OfflineCommandRepository {
  private readonly byId = new Map<string, OfflineCommand>();

  async enqueue(command: OfflineCommand): Promise<OfflineCommand> {
    this.byId.set(command.id, command);
    return command;
  }

  async get(id: OfflineCommand['id']): Promise<OfflineCommand | null> {
    return this.byId.get(id) ?? null;
  }

  async getByDeviceAndIdempotencyKey(
    deviceId: OfflineCommand['deviceId'],
    idempotencyKey: string,
  ): Promise<OfflineCommand | null> {
    return (
      [...this.byId.values()].find(
        (command) => command.deviceId === deviceId && command.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async markApplied(id: OfflineCommand['id'], appliedAt: Date): Promise<OfflineCommand> {
    return this.patch(id, { status: 'APPLIED', appliedAt });
  }

  async markRejected(id: OfflineCommand['id'], rejectionCode: string): Promise<OfflineCommand> {
    return this.patch(id, { status: 'REJECTED', rejectionCode });
  }

  async markExpired(id: OfflineCommand['id']): Promise<OfflineCommand> {
    return this.patch(id, { status: 'EXPIRED' });
  }

  private patch(id: OfflineCommand['id'], values: Partial<OfflineCommand>): OfflineCommand {
    const current = this.byId.get(id);
    if (current === undefined) throw new Error('command missing');
    const next = { ...current, ...values } as OfflineCommand;
    this.byId.set(id, next);
    return next;
  }
}

class OneDeviceRepository implements DeviceRepository {
  constructor(private readonly device: Device) {}

  async save(): Promise<void> {}
  async get(): Promise<Device | null> {
    return this.device;
  }
  async recordHeartbeat(): Promise<void> {}
  async revoke(): Promise<void> {}
  async listReachable(): Promise<readonly Device[]> {
    return this.device.revokedAt === undefined ? [this.device] : [];
  }
}

function executorCounter() {
  const calls: OfflineCommand[] = [];
  const executor: OfflineCommandExecutor = {
    async execute(command) {
      calls.push(command);
    },
  };
  return { calls, executor };
}

function offlineCommand(device: Device, expiresAt = new Date('2026-09-01T15:10:00Z')) {
  return createOfflineCommand({
    deviceId: device.id,
    actorPersonId: personId,
    capability: 'shopping.list.modify',
    payload: { item: 'milk' },
    idempotencyKey: `negative-${device.id}`,
    createdAt: new Date('2026-09-01T14:59:00Z'),
    expiresAt,
  });
}

describe('Live v2 security and reliability acceptance negatives', () => {
  it('treats expired location evidence as UNKNOWN instead of confident PRESENT', () => {
    const state = resolvePresence(
      [
        {
          source: 'LOCATION',
          state: 'PRESENT',
          observedAt: new Date('2026-09-01T14:50:00Z'),
          expiresAt: now,
          confidence: 0.99,
        },
      ],
      now,
    );

    expect(state).toEqual({ state: 'UNKNOWN', confidence: 0, sources: [] });
  });

  it('does not use expired weather as a live rain fact', () => {
    const bundled = bundleDeparturePreparation({
      householdId,
      targetPersonId: personId,
      event: event(),
      presence: present(),
      route: route(),
      weather: weather(now),
      now,
      departureBufferMinutes: 10,
      correlationId: 'negative-expired-weather',
    });

    expect(bundled).toBeDefined();
    expect(bundled?.message).toBe('Φύγετε περίπου 35 λεπτά νωρίτερα.');
    expect(bundled?.situation.supportingFactors).not.toEqual(
      expect.arrayContaining([{ name: 'rain_probability', value: 0.8 }]),
    );
  });

  it('deduplicates repeated weather/location context into one active fingerprint and suppresses re-alert', async () => {
    const store = new InMemoryActiveSituationStore();
    const build = () =>
      bundleDeparturePreparation({
        householdId,
        targetPersonId: personId,
        event: event(),
        presence: present(),
        route: route(),
        weather: weather(),
        now,
        departureBufferMinutes: 10,
        correlationId: 'negative-duplicate-input',
      })!;

    const first = build();
    const firstActive = await store.upsert(first.situation);
    const repeated = build();
    const repeatedActive = await store.upsert(repeated.situation);
    const materialChange = hasMaterialDepartureChange(
      { requiredDepartureAt: first.requiredDepartureAt!, urgency: first.urgency },
      { requiredDepartureAt: repeated.requiredDepartureAt!, urgency: repeated.urgency },
    );

    expect(repeatedActive.id).toBe(firstActive.id);
    expect(repeatedActive.fingerprint).toBe(firstActive.fingerprint);
    expect(
      shouldSuppressByCooldown({
        lastEmittedAt: now,
        now: new Date('2026-09-01T15:01:00Z'),
        materialChange,
      }),
    ).toBe(true);
  });

  it('does not re-alert for a route shift below the material departure threshold', () => {
    expect(
      hasMaterialDepartureChange(
        { requiredDepartureAt: new Date('2026-09-01T15:00:00Z'), urgency: 0.7 },
        { requiredDepartureAt: new Date('2026-09-01T14:55:01Z'), urgency: 0.75 },
      ),
    ).toBe(false);
  });

  it('keeps deterministic departure preparation functional when the AI gateway is unavailable', async () => {
    const modelResult = await new UnavailableModelGateway().summarize('departure context');
    const bundled = bundleDeparturePreparation({
      householdId,
      targetPersonId: personId,
      event: event(),
      presence: present(),
      route: route(),
      weather: weather(),
      now,
      departureBufferMinutes: 10,
      correlationId: 'negative-ai-unavailable',
    });

    expect(modelResult).toEqual({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    expect(bundled?.requiredDepartureAt).toEqual(new Date('2026-09-01T14:55:00Z'));
  });

  it('denies a protected capability from an untrusted shared device', () => {
    expect(
      evaluateLivePolicy({
        capability: 'door.unlock',
        requested: 'act',
        grant: { view: true, suggest: true, act: 'allowed' },
        authenticationStrength: 'STRONG_AUTHENTICATED',
        device: sharedDevice(),
        sessionScope: 'HOUSEHOLD_SHARED',
        resourcePrivacy: 'HOUSEHOLD',
      }),
    ).toBe('DENY');
  });

  it('performs zero external executor calls when a protected offline action is denied', async () => {
    const device = personalDevice();
    const commands = new MemoryCommandRepository();
    const queued = await commands.enqueue(offlineCommand(device));
    const { calls, executor } = executorCounter();

    const result = await processOfflineCommand({
      commandId: queued.id,
      now,
      commands,
      devices: new OneDeviceRepository(device),
      policy: { evaluate: () => 'DENY' },
      executor,
    });

    expect(result).toMatchObject({ status: 'REJECTED', rejectionCode: 'POLICY_DENY' });
    expect(calls).toHaveLength(0);
  });

  it('keeps a notification failed when its delivery provider fails', async () => {
    const repository = new MemoryNotificationRepository();
    const delivery = new FailingDelivery();
    const notification = await createNotification(
      {
        householdId,
        outcome: 'suggest',
        title: 'Departure',
        message: 'Leave now',
        situationType: 'DEPARTURE_PREPARATION',
        supportingFactors: [],
        correlationId: 'negative-delivery-failure',
      },
      { repository, delivery, clock: new FixedClock(now) },
    );

    expect(notification.state).toBe('failed');
    expect(notification.deliveryReceipt).toBeUndefined();
    expect(delivery.attempts).toHaveLength(1);
    await expect(repository.get(notification.id)).resolves.toMatchObject({ state: 'failed' });
  });

  it('rejects signed ingress from a revoked device and does not execute its pending command', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const revoked = createDevice({
      householdId,
      ownerPersonId: personId,
      deviceType: 'PHONE',
      platform: 'IOS',
      capabilities: ['LOCATION', 'shopping.list.modify'],
      trustLevel: 'TRUSTED',
      connectionState: 'OFFLINE',
      agentVersion: '2.0.0',
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      lastSeenAt: new Date('2026-09-01T14:55:00Z'),
      registeredAt: new Date('2026-09-01T14:00:00Z'),
      revokedAt: new Date('2026-09-01T14:58:00Z'),
    });
    const repository = new OneDeviceRepository(revoked);
    const app = Fastify();
    let ingested = 0;
    await registerDeviceAgentRoutes(app, {
      deviceRepository: repository,
      now: () => now,
      async ingestLocationSignal() {
        ingested += 1;
      },
    });
    const timestamp = new Date('2026-09-01T14:59:00Z');
    const rawBody = JSON.stringify({
      semanticPlace: 'HOME',
      latitude: 34.92,
      longitude: 33.62,
      observedAt: '2026-09-01T14:59:30.000Z',
      expiresAt: '2026-09-01T15:09:30.000Z',
      movementState: 'STATIONARY',
      source: 'DEVICE_LOCATION',
      privacyScope: 'HOUSEHOLD',
    });
    const bodyHash = createHash('sha256').update(Buffer.from(rawBody, 'utf8')).digest('hex');
    const signedBytes = Buffer.from(`${revoked.id}\n${timestamp.toISOString()}\n${bodyHash}`, 'utf8');
    const signature = sign(null, signedBytes, privateKey).toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': revoked.id,
        'x-agnes-timestamp': timestamp.toISOString(),
        'x-agnes-signature': signature,
      },
      payload: rawBody,
    });
    expect(response.statusCode).toBe(403);
    expect(ingested).toBe(0);
    await app.close();

    const commands = new MemoryCommandRepository();
    const queued = await commands.enqueue(offlineCommand(revoked));
    const { calls, executor } = executorCounter();
    const processed = await processOfflineCommand({
      commandId: queued.id,
      now,
      commands,
      devices: repository,
      policy: { evaluate: () => 'ALLOW' },
      executor,
    });

    expect(processed).toMatchObject({ status: 'REJECTED', rejectionCode: 'DEVICE_REVOKED' });
    expect(calls).toHaveLength(0);
  });

  it('marks an expired offline command EXPIRED with zero external side effect', async () => {
    const device = personalDevice();
    const commands = new MemoryCommandRepository();
    const queued = await commands.enqueue(offlineCommand(device, now));
    const { calls, executor } = executorCounter();

    const result = await processOfflineCommand({
      commandId: queued.id,
      now,
      commands,
      devices: new OneDeviceRepository(device),
      policy: { evaluate: () => 'ALLOW' },
      executor,
    });

    expect(result.status).toBe('EXPIRED');
    expect(calls).toHaveLength(0);
  });

  it('does not turn notification state events into situation recursion', async () => {
    const bus = new InMemoryDomainEventBus();
    let notificationEvents = 0;
    let situationEvents = 0;
    bus.subscribe('notification.delivery.verified.v1', async () => {
      notificationEvents += 1;
    });
    bus.subscribe('situation.detected.v1', async () => {
      situationEvents += 1;
    });

    await bus.publish(
      createAgnesEvent({
        type: 'notification.delivery.verified.v1',
        version: 1,
        occurredAt: now,
        receivedAt: now,
        source: 'negative-test',
        householdId,
        entityType: 'notification',
        entityId: 'notification-1',
        payload: { state: 'delivered' },
        metadata: {},
      }),
    );

    expect(notificationEvents).toBe(1);
    expect(situationEvents).toBe(0);
  });

  it('never routes a PRIVATE candidate to a shared household display', () => {
    const candidate: NotificationCandidate = {
      id: 'private-candidate',
      householdId,
      targetPersonId: personId,
      privacy: 'PRIVATE',
      allowedChannels: ['TABLET_ALERT', 'VOICE_HOME'],
      title: 'Private',
      message: 'Private content',
    };

    expect(
      routeNotification({
        candidate,
        targetPresence: 'PRESENT',
        attention: 'AVAILABLE',
        reachableDevices: [sharedDevice()],
      }),
    ).toBe('NO_ROUTE');
  });
});
