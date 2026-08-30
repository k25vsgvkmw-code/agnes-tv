import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PostgresAuditRepository } from '../../src/persistence/postgres-audit-repository.js';
import { PostgresHealthBridgeRepository } from '../../src/persistence/postgres-health-bridge-repository.js';
import { PostgresHealthMeasurementRepository } from '../../src/persistence/postgres-health-measurement-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { createPostgresPool, withTransaction } from '../../src/persistence/postgres.js';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import { hashHealthBridgeToken, HealthBridgeAuthenticator } from '../../src/health/health-authenticator.js';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import type { RawHealthMeasurement } from '../../src/health/health-measurement.js';
import { importHealthMeasurement } from '../../src/health/import-health-measurement.js';
import { recordHealthHeartbeat } from '../../src/health/record-health-heartbeat.js';
import { HealthStatusService } from '../../src/health/health-status-service.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { HouseholdId, PersonId } from '../../src/kernel/ids.js';
import { registerHealthRoutes } from '../../src/transport/health-routes.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests');

const pool = createPostgresPool(databaseUrl);
const bridgeRepository = new PostgresHealthBridgeRepository(pool);
const measurementRepository = new PostgresHealthMeasurementRepository(pool);
const outboxRepository = new PostgresOutboxRepository(pool);
const auditRepository = new PostgresAuditRepository(pool);
const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const authenticator = new HealthBridgeAuthenticator(bridgeRepository);
const statusService = new HealthStatusService(bridgeRepository, clock, defaultHealthConfig);

const householdId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as HouseholdId;
const personId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as PersonId;
const bridgeId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const token = 'device-token-123';

const bridge: HealthBridgeRegistration = {
  id: bridgeId,
  householdId,
  personId,
  provider: 'health_connect',
  sourceDeviceId: 'pixel-route-test',
  tokenHash: hashHealthBridgeToken(token),
  allowedKinds: ['steps'],
  authState: 'active',
  lastHeartbeatAt: null,
  lastMeasurementAt: null,
  createdAt: new Date('2026-08-30T08:00:00Z'),
  updatedAt: new Date('2026-08-30T08:00:00Z'),
};

const measurement: RawHealthMeasurement = {
  kind: 'steps',
  value: 8432,
  unit: 'count',
  measuredAt: '2026-08-30T10:00:00Z',
  externalId: 'route-steps-1',
};

let app: FastifyInstance;

function authorization(value = token): Record<string, string> {
  return { authorization: `Bearer ${value}` };
}

async function buildTestApp(): Promise<FastifyInstance> {
  const instance = Fastify();
  await registerHealthRoutes(instance, {
    authenticator,
    statusService,
    recordHeartbeat: (registration) =>
      recordHealthHeartbeat(registration, { bridgeRepository, clock }),
    importMeasurement: (raw, registration, correlationId) =>
      importHealthMeasurement(raw, registration, {
        measurementRepository,
        bridgeRepository,
        outboxRepository,
        auditRepository,
        clock,
        config: defaultHealthConfig,
        correlationId,
        runInTransaction: <T>(operation: Parameters<typeof withTransaction<T>>[1]) =>
          withTransaction(pool, operation),
      }),
  });
  await instance.ready();
  return instance;
}

beforeEach(async () => {
  await pool.query('DELETE FROM audit_records');
  await pool.query('DELETE FROM outbox_events');
  await pool.query('DELETE FROM health_measurements');
  await pool.query('DELETE FROM health_bridges');
  await pool.query('DELETE FROM people');
  await pool.query('DELETE FROM households');

  await pool.query(
    `INSERT INTO households (id, name, timezone, locale, status)
     VALUES ($1, 'AGNES Route Home', 'Asia/Nicosia', 'el-CY', 'active')`,
    [householdId],
  );
  await pool.query(
    `INSERT INTO people (id, household_id, display_name, role, locale, timezone, status)
     VALUES ($1, $2, 'Daddy', 'parent', 'el-CY', 'Asia/Nicosia', 'active')`,
    [personId, householdId],
  );
  await bridgeRepository.save(bridge);
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await pool.end();
});

describe('Fastify health integration routes', () => {
  it('reports connected_no_data after an authenticated heartbeat with no measurement', async () => {
    const heartbeat = await app.inject({
      method: 'POST',
      url: '/integrations/health/heartbeat',
      headers: authorization(),
    });
    expect(heartbeat.statusCode).toBe(204);
    expect(heartbeat.body).toBe('');

    const status = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });

    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      state: 'connected_no_data',
      lastHeartbeatAt: '2026-08-30T12:00:00.000Z',
      lastMeasurementAt: null,
      evaluatedAt: '2026-08-30T12:00:00.000Z',
    });
    expect(status.body).not.toContain(token);
    expect(status.body).not.toContain('value');
  });

  it('returns 401 for missing and unknown bearer credentials', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_UNAUTHORIZED' },
    });

    const unknown = await app.inject({
      method: 'POST',
      url: '/integrations/health/heartbeat',
      headers: authorization('wrong-token'),
    });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_UNAUTHORIZED' },
    });
    expect(unknown.body).not.toContain('wrong-token');
  });

  it('returns 401 for an expired bridge credential', async () => {
    await bridgeRepository.save({ ...bridge, authState: 'expired' });

    const response = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'HEALTH_AUTH_EXPIRED' },
    });
  });

  it('returns 201 for a new valid measurement and changes status to live', async () => {
    const imported = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });

    expect(imported.statusCode).toBe(201);
    expect(imported.json()).toMatchObject({ change: 'created' });
    expect(imported.json().id).toMatch(/^[0-9a-f-]{36}$/);
    expect(imported.body).not.toContain('8432');

    const status = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization(),
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      state: 'live',
      lastMeasurementAt: '2026-08-30T10:00:00.000Z',
    });
  });

  it('returns the existing id with unchanged when an identical measurement is retried', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: measurement,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ id: first.json().id, change: 'unchanged' });

    const rows = await pool.query<{ count: string }>(
      'SELECT count(*) FROM health_measurements WHERE bridge_id = $1',
      [bridgeId],
    );
    expect(Number(rows.rows[0]?.count ?? 0)).toBe(1);
  });

  it('returns 400 for a measurement with an invalid unit pairing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: { ...measurement, unit: 'kg' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(response.body).not.toContain('8432');
  });

  it('rejects ownership and source fields supplied by the HTTP caller', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization(),
      payload: {
        ...measurement,
        householdId: 'attacker-household',
        personId: 'attacker-person',
        provider: 'healthkit',
        sourceDeviceId: 'attacker-device',
      },
    });

    expect(response.statusCode).toBe(400);

    const rows = await pool.query<{ count: string }>('SELECT count(*) FROM health_measurements');
    expect(Number(rows.rows[0]?.count ?? 0)).toBe(0);
  });
});
