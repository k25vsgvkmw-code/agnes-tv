import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDevice } from '../../src/devices/device.js';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { pool } from '../../src/persistence/postgres.js';
import { PostgresDeviceRepository } from '../../src/persistence/postgres-device-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresPushTokenRepository } from '../../src/persistence/postgres-push-token-repository.js';

const householdRepository = new PostgresHouseholdRepository(pool);
const deviceRepository = new PostgresDeviceRepository(pool);
const pushTokenRepository = new PostgresPushTokenRepository(pool);

beforeAll(async () => {
  for (const migrationPath of [
    'src/persistence/migrations/001_core.sql',
    'src/persistence/migrations/002_live_core.sql',
  ]) {
    const migration = await readFile(resolve(process.cwd(), migrationPath), 'utf8');
    await pool.query(migration);
  }
});

beforeEach(async () => {
  await pool.query(
    'TRUNCATE device_push_tokens, devices, outbox_events, calendar_events, external_references, people, households CASCADE',
  );
});

afterAll(async () => {
  await pool.end();
});

function publicKeyPem(): string {
  const { publicKey } = generateKeyPairSync('ed25519');
  return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

async function seedOwner() {
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

  await householdRepository.saveHousehold(household);
  await householdRepository.savePerson(person);
  return { household, person };
}

describe('PostgreSQL Live v2 device repositories', () => {
  it('round-trips identity, records heartbeat, and removes revoked devices from reachability and push routing', async () => {
    const { household, person } = await seedOwner();
    const device = createDevice({
      householdId: household.id,
      ownerPersonId: person.id,
      deviceType: 'PHONE',
      platform: 'IOS',
      capabilities: ['LOCATION', 'MOBILE_PUSH'],
      trustLevel: 'TRUSTED',
      connectionState: 'ONLINE',
      agentVersion: '2.0.0',
      publicKeyPem: publicKeyPem(),
      lastSeenAt: new Date('2026-09-01T14:55:00Z'),
      registeredAt: new Date('2026-09-01T14:00:00Z'),
    });

    await deviceRepository.save(device);
    await expect(deviceRepository.get(device.id)).resolves.toEqual(device);

    const heartbeatAt = new Date('2026-09-01T15:00:00Z');
    await deviceRepository.recordHeartbeat(device.id, heartbeatAt);
    await expect(deviceRepository.get(device.id)).resolves.toMatchObject({
      id: device.id,
      connectionState: 'ONLINE',
      lastSeenAt: heartbeatAt,
    });
    await expect(deviceRepository.listReachable(household.id)).resolves.toMatchObject([
      { id: device.id },
    ]);

    const token = await pushTokenRepository.register({
      deviceId: device.id,
      provider: 'APNS',
      token: 'device-token-1',
      createdAt: heartbeatAt,
    });
    await expect(pushTokenRepository.listActiveForDevice(device.id)).resolves.toEqual([token]);

    const revokedAt = new Date('2026-09-01T15:05:00Z');
    await deviceRepository.revoke(device.id, revokedAt);

    await expect(deviceRepository.get(device.id)).resolves.toMatchObject({ revokedAt });
    await expect(deviceRepository.listReachable(household.id)).resolves.toEqual([]);
    await expect(pushTokenRepository.listActiveForDevice(device.id)).resolves.toEqual([]);
  });

  it('supports explicit revocation of every active push token for a device', async () => {
    const { household, person } = await seedOwner();
    const device = createDevice({
      householdId: household.id,
      ownerPersonId: person.id,
      deviceType: 'PHONE',
      platform: 'ANDROID',
      capabilities: ['MOBILE_PUSH'],
      trustLevel: 'TRUSTED',
      connectionState: 'ONLINE',
      agentVersion: '2.0.0',
      publicKeyPem: publicKeyPem(),
      lastSeenAt: new Date('2026-09-01T14:55:00Z'),
      registeredAt: new Date('2026-09-01T14:00:00Z'),
    });
    await deviceRepository.save(device);

    await pushTokenRepository.register({
      deviceId: device.id,
      provider: 'FCM',
      token: 'device-token-2',
      createdAt: new Date('2026-09-01T15:00:00Z'),
    });

    await pushTokenRepository.revokeForDevice(device.id, new Date('2026-09-01T15:05:00Z'));
    await expect(pushTokenRepository.listActiveForDevice(device.id)).resolves.toEqual([]);
  });
});
