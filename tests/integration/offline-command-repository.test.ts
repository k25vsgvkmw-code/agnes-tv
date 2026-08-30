import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDevice } from '../../src/devices/device.js';
import { createOfflineCommand } from '../../src/devices/offline-command.js';
import { createHousehold } from '../../src/household/household.js';
import { createPerson } from '../../src/household/person.js';
import { PostgresDeviceRepository } from '../../src/persistence/postgres-device-repository.js';
import { PostgresHouseholdRepository } from '../../src/persistence/postgres-household-repository.js';
import { PostgresOfflineCommandRepository } from '../../src/persistence/postgres-offline-command-repository.js';
import { pool } from '../../src/persistence/postgres.js';

const householdRepository = new PostgresHouseholdRepository(pool);
const deviceRepository = new PostgresDeviceRepository(pool);
const commandRepository = new PostgresOfflineCommandRepository(pool);

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
    'TRUNCATE offline_commands, device_push_tokens, devices, outbox_events, calendar_events, external_references, people, households CASCADE',
  );
});

afterAll(async () => {
  await pool.end();
});

function publicKeyPem(): string {
  const { publicKey } = generateKeyPairSync('ed25519');
  return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

async function seedDevice() {
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

  const device = createDevice({
    householdId: household.id,
    ownerPersonId: person.id,
    deviceType: 'PHONE',
    platform: 'IOS',
    capabilities: ['smart_home.light.control'],
    trustLevel: 'TRUSTED',
    connectionState: 'OFFLINE',
    agentVersion: '2.0.0',
    publicKeyPem: publicKeyPem(),
    lastSeenAt: new Date('2026-09-01T14:55:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
  });
  await deviceRepository.save(device);
  return { person, device };
}

describe('PostgreSQL Live v2 offline command repository', () => {
  it('round-trips pending commands including optional baseVersion', async () => {
    const { person, device } = await seedDevice();
    const command = createOfflineCommand({
      deviceId: device.id,
      actorPersonId: person.id,
      capability: 'smart_home.light.control',
      payload: { room: 'kitchen', state: 'on' },
      idempotencyKey: 'lights-kitchen-on-1',
      createdAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:10:00Z'),
      baseVersion: 'lights:v17',
    });

    await expect(commandRepository.enqueue(command)).resolves.toEqual(command);
    await expect(commandRepository.get(command.id)).resolves.toEqual(command);
  });

  it('deduplicates the same device and idempotency key without replacing the first command', async () => {
    const { person, device } = await seedDevice();
    const first = createOfflineCommand({
      deviceId: device.id,
      actorPersonId: person.id,
      capability: 'shopping.list.modify',
      payload: { item: 'milk' },
      idempotencyKey: 'shopping-add-milk-1',
      createdAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:30:00Z'),
    });
    const duplicate = createOfflineCommand({
      deviceId: device.id,
      actorPersonId: person.id,
      capability: 'shopping.list.modify',
      payload: { item: 'changed-payload' },
      idempotencyKey: 'shopping-add-milk-1',
      createdAt: new Date('2026-09-01T15:01:00Z'),
      expiresAt: new Date('2026-09-01T15:31:00Z'),
    });

    await expect(commandRepository.enqueue(first)).resolves.toEqual(first);
    await expect(commandRepository.enqueue(duplicate)).resolves.toEqual(first);
    await expect(commandRepository.getByDeviceAndIdempotencyKey(device.id, first.idempotencyKey)).resolves.toEqual(first);

    const count = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM offline_commands');
    expect(count.rows[0]?.count).toBe('1');
  });
});
