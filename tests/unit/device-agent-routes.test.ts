import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { createDevice, type Device } from '../../src/devices/device.js';
import type { DeviceRepository } from '../../src/devices/device-repository.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import type { LocationSignal } from '../../src/location/location-signal.js';
import { registerDeviceAgentRoutes } from '../../src/transport/device-agent-routes.js';

const now = new Date('2026-09-01T15:00:00Z');

function fixture(revokedAt?: Date) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const device = createDevice({
    householdId: newHouseholdId(),
    deviceType: 'PHONE',
    platform: 'IOS',
    capabilities: ['LOCATION'],
    trustLevel: 'TRUSTED',
    connectionState: 'ONLINE',
    agentVersion: '2.0.0',
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    lastSeenAt: new Date('2026-09-01T14:55:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
    ...(revokedAt === undefined ? {} : { revokedAt }),
  });
  return { device, privateKey };
}

function repositoryWith(device: Device | null): DeviceRepository {
  return {
    async save() {},
    async get() {
      return device;
    },
    async recordHeartbeat() {},
    async revoke() {},
    async listReachable() {
      return [];
    },
  };
}

function signatureFor(
  device: Device,
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'],
  timestamp: Date,
  rawBody: string,
): string {
  const bodyHash = createHash('sha256').update(Buffer.from(rawBody, 'utf8')).digest('hex');
  const signedBytes = Buffer.from(`${device.id}\n${timestamp.toISOString()}\n${bodyHash}`, 'utf8');
  return sign(null, signedBytes, privateKey).toString('base64');
}

function validLocationBody(): string {
  return JSON.stringify({
    semanticPlace: 'HOME',
    latitude: 34.92,
    longitude: 33.62,
    observedAt: '2026-09-01T14:59:30.000Z',
    expiresAt: '2026-09-01T15:09:30.000Z',
    movementState: 'STATIONARY',
    source: 'DEVICE_LOCATION',
    privacyScope: 'HOUSEHOLD',
  });
}

async function buildRouteFixture(device: Device) {
  const app = Fastify();
  const ingested: LocationSignal[] = [];
  await registerDeviceAgentRoutes(app, {
    deviceRepository: repositoryWith(device),
    now: () => now,
    async ingestLocationSignal(signal) {
      ingested.push(signal);
    },
  });
  return { app, ingested };
}

describe('device-agent routes', () => {
  it('verifies the exact raw payload before hydrating and ingesting a canonical location signal', async () => {
    const { device, privateKey } = fixture();
    const { app, ingested } = await buildRouteFixture(device);
    const timestamp = new Date('2026-09-01T14:59:00Z');
    const rawBody = validLocationBody();

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': device.id,
        'x-agnes-timestamp': timestamp.toISOString(),
        'x-agnes-signature': signatureFor(device, privateKey, timestamp, rawBody),
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(ingested).toHaveLength(1);
    expect(ingested[0]).toMatchObject({
      deviceId: device.id,
      semanticPlace: 'HOME',
      source: 'DEVICE_LOCATION',
      privacyScope: 'HOUSEHOLD',
    });
    expect(ingested[0]?.observedAt).toBeInstanceOf(Date);
    expect(ingested[0]?.expiresAt).toBeInstanceOf(Date);

    await app.close();
  });

  it('rejects a body changed after signing and performs zero ingestion', async () => {
    const { device, privateKey } = fixture();
    const { app, ingested } = await buildRouteFixture(device);
    const timestamp = new Date('2026-09-01T14:59:00Z');
    const signedBody = validLocationBody();
    const changedBody = signedBody.replace('HOME', 'WORK');

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': device.id,
        'x-agnes-timestamp': timestamp.toISOString(),
        'x-agnes-signature': signatureFor(device, privateKey, timestamp, signedBody),
      },
      payload: changedBody,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { code: 'DEVICE_SIGNATURE_INVALID' } });
    expect(ingested).toEqual([]);

    await app.close();
  });

  it('authenticates before validating location payloads', async () => {
    const { device } = fixture();
    const { app, ingested } = await buildRouteFixture(device);

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': device.id,
        'x-agnes-timestamp': '2026-09-01T14:59:00.000Z',
        'x-agnes-signature': 'not-a-valid-signature',
      },
      payload: '{"latitude":999}',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { code: 'DEVICE_SIGNATURE_INVALID' } });
    expect(ingested).toEqual([]);

    await app.close();
  });

  it('returns 400 for a canonically invalid location only after a valid signature', async () => {
    const { device, privateKey } = fixture();
    const { app, ingested } = await buildRouteFixture(device);
    const timestamp = new Date('2026-09-01T14:59:00Z');
    const rawBody = JSON.stringify({
      semanticPlace: 'HOME',
      latitude: 999,
      longitude: 33.62,
      observedAt: '2026-09-01T14:59:30.000Z',
      expiresAt: '2026-09-01T15:09:30.000Z',
      movementState: 'STATIONARY',
      source: 'DEVICE_LOCATION',
      privacyScope: 'HOUSEHOLD',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': device.id,
        'x-agnes-timestamp': timestamp.toISOString(),
        'x-agnes-signature': signatureFor(device, privateKey, timestamp, rawBody),
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(400);
    expect(ingested).toEqual([]);

    await app.close();
  });

  it('maps revoked devices to 403 and performs zero ingestion', async () => {
    const { device, privateKey } = fixture(new Date('2026-09-01T14:58:00Z'));
    const { app, ingested } = await buildRouteFixture(device);
    const timestamp = new Date('2026-09-01T14:59:00Z');
    const rawBody = validLocationBody();

    const response = await app.inject({
      method: 'POST',
      url: '/live/device/signals/location',
      headers: {
        'content-type': 'application/json',
        'x-agnes-device-id': device.id,
        'x-agnes-timestamp': timestamp.toISOString(),
        'x-agnes-signature': signatureFor(device, privateKey, timestamp, rawBody),
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: 'DEVICE_REVOKED' } });
    expect(ingested).toEqual([]);

    await app.close();
  });
});
