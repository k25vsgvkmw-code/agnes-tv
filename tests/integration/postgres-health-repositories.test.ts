import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import type { HealthMeasurement } from '../../src/health/health-measurement.js';
import type { HouseholdId, PersonId } from '../../src/kernel/ids.js';
import { PostgresHealthBridgeRepository } from '../../src/persistence/postgres-health-bridge-repository.js';
import { PostgresHealthMeasurementRepository } from '../../src/persistence/postgres-health-measurement-repository.js';
import { createPostgresPool } from '../../src/persistence/postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests');

const pool = createPostgresPool(databaseUrl);
const bridgeRepo = new PostgresHealthBridgeRepository(pool);
const measurementRepo = new PostgresHealthMeasurementRepository(pool);

const householdId = '11111111-1111-4111-8111-111111111111' as HouseholdId;
const personId = '22222222-2222-4222-8222-222222222222' as PersonId;
const bridgeId = '33333333-3333-4333-8333-333333333333';

const bridge: HealthBridgeRegistration = {
  id: bridgeId,
  householdId,
  personId,
  provider: 'health_connect',
  sourceDeviceId: 'pixel-1',
  tokenHash: '8cc7af5d8723c6b36f6d973b8044c96b7ef7b474af75e0ed12591be7657989dc',
  allowedKinds: ['steps', 'heart_rate', 'sleep', 'weight', 'active_energy'],
  authState: 'active',
  lastHeartbeatAt: null,
  lastMeasurementAt: null,
  createdAt: new Date('2026-08-30T08:00:00Z'),
  updatedAt: new Date('2026-08-30T08:00:00Z'),
};

const measurement: HealthMeasurement = {
  id: '44444444-4444-4444-8444-444444444444',
  householdId,
  personId,
  kind: 'steps',
  value: 8432,
  unit: 'count',
  measuredAt: new Date('2026-08-30T10:00:00Z'),
  sourceProvider: 'health_connect',
  sourceDeviceId: 'pixel-1',
  externalId: 'hc-steps-42',
  dedupeKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  receivedAt: new Date('2026-08-30T12:00:00Z'),
  metadata: { source: 'integration-test' },
};

beforeEach(async () => {
  await pool.query('DELETE FROM health_measurements');
  await pool.query('DELETE FROM health_bridges');
  await pool.query('DELETE FROM people');
  await pool.query('DELETE FROM households');

  await pool.query(
    `INSERT INTO households (id, name, timezone, locale, status)
     VALUES ($1, 'AGNES Home', 'Asia/Nicosia', 'el-CY', 'active')`,
    [householdId],
  );
  await pool.query(
    `INSERT INTO people (id, household_id, display_name, role, locale, timezone, status)
     VALUES ($1, $2, 'Daddy', 'parent', 'el-CY', 'Asia/Nicosia', 'active')`,
    [personId, householdId],
  );
  await bridgeRepo.save(bridge);
});

afterAll(async () => {
  await pool.end();
});

describe('PostgreSQL health repositories', () => {
  it('stores a logical measurement only once by dedupe key', async () => {
    const first = await measurementRepo.insertIfAbsent(measurement);
    const second = await measurementRepo.insertIfAbsent({
      ...measurement,
      id: '55555555-5555-4555-8555-555555555555',
    });

    expect(first.change).toBe('created');
    expect(second.change).toBe('unchanged');
    expect(second.measurement.id).toBe(first.measurement.id);

    const count = await pool.query<{ count: string }>('SELECT count(*) FROM health_measurements');
    expect(Number(count.rows[0]?.count)).toBe(1);
  });

  it('finds a bridge by token hash', async () => {
    const found = await bridgeRepo.getByTokenHash(bridge.tokenHash);

    expect(found).toMatchObject({
      id: bridgeId,
      householdId,
      personId,
      provider: 'health_connect',
      sourceDeviceId: 'pixel-1',
      tokenHash: bridge.tokenHash,
    });
  });

  it('advances heartbeat and measurement timestamps without changing bridge ownership', async () => {
    const heartbeatAt = new Date('2026-08-30T11:00:00Z');
    const measurementAt = new Date('2026-08-30T11:30:00Z');

    await bridgeRepo.recordHeartbeat(bridgeId, heartbeatAt);
    await bridgeRepo.recordMeasurementSeen(bridgeId, measurementAt);

    const updated = await bridgeRepo.getById(bridgeId);
    expect(updated).toMatchObject({
      id: bridgeId,
      householdId,
      personId,
      provider: 'health_connect',
      sourceDeviceId: 'pixel-1',
      lastHeartbeatAt: heartbeatAt,
      lastMeasurementAt: measurementAt,
    });
  });
});
