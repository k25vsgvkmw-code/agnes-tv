import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import type { HealthBridgeRegistration } from '../../src/health/health-bridge.js';
import type { RawHealthMeasurement } from '../../src/health/health-measurement.js';
import { importHealthMeasurement } from '../../src/health/import-health-measurement.js';
import { FixedClock } from '../../src/kernel/clock.js';
import type { HouseholdId, PersonId } from '../../src/kernel/ids.js';
import { PostgresAuditRepository } from '../../src/persistence/postgres-audit-repository.js';
import { PostgresHealthBridgeRepository } from '../../src/persistence/postgres-health-bridge-repository.js';
import { PostgresHealthMeasurementRepository } from '../../src/persistence/postgres-health-measurement-repository.js';
import { PostgresOutboxRepository } from '../../src/persistence/postgres-outbox-repository.js';
import { createPostgresPool, withTransaction } from '../../src/persistence/postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests');

const pool = createPostgresPool(databaseUrl);
const bridgeRepository = new PostgresHealthBridgeRepository(pool);
const measurementRepository = new PostgresHealthMeasurementRepository(pool);
const outboxRepository = new PostgresOutboxRepository(pool);
const auditRepository = new PostgresAuditRepository(pool);
const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));

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
  allowedKinds: ['steps'],
  authState: 'active',
  lastHeartbeatAt: null,
  lastMeasurementAt: null,
  createdAt: new Date('2026-08-30T08:00:00Z'),
  updatedAt: new Date('2026-08-30T08:00:00Z'),
};

const rawMeasurement: RawHealthMeasurement = {
  kind: 'steps',
  value: 8432,
  unit: 'count',
  measuredAt: '2026-08-30T10:00:00Z',
  externalId: 'hc-steps-42',
  metadata: { source: 'integration-test' },
};

function dependencies(correlationId: string) {
  return {
    measurementRepository,
    bridgeRepository,
    outboxRepository,
    auditRepository,
    clock,
    config: defaultHealthConfig,
    correlationId,
    runInTransaction: <T>(operation: Parameters<typeof withTransaction<T>>[1]) =>
      withTransaction(pool, operation),
  };
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*) FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
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
     VALUES ($1, 'AGNES Home', 'Asia/Nicosia', 'el-CY', 'active')`,
    [householdId],
  );
  await pool.query(
    `INSERT INTO people (id, household_id, display_name, role, locale, timezone, status)
     VALUES ($1, $2, 'Daddy', 'parent', 'el-CY', 'Asia/Nicosia', 'active')`,
    [personId, householdId],
  );
  await bridgeRepository.save(bridge);
});

afterAll(async () => {
  await pool.end();
});

describe('importHealthMeasurement', () => {
  it('emits one import event when the device retries the same logical measurement', async () => {
    const deps = dependencies('corr-retry-1');

    const first = await importHealthMeasurement(rawMeasurement, bridge, deps);
    const second = await importHealthMeasurement(rawMeasurement, bridge, deps);

    expect(first.change).toBe('created');
    expect(second.change).toBe('unchanged');
    expect(second.measurement.id).toBe(first.measurement.id);
    expect(await countRows('health_measurements')).toBe(1);

    const outbox = await pool.query<{ event_payload: Record<string, unknown> }>(
      `SELECT event_payload
       FROM outbox_events
       WHERE event_type = 'health.measurement.imported.v1'`,
    );
    expect(outbox.rows).toHaveLength(1);
    expect(JSON.stringify(outbox.rows[0]?.event_payload)).not.toContain('8432');
    expect(JSON.stringify(outbox.rows[0]?.event_payload)).not.toContain('"value"');

    const audits = await pool.query<{
      action: string;
      outcome: string;
      error_code: string | null;
      metadata: Record<string, unknown>;
    }>(
      `SELECT action, outcome, error_code, metadata
       FROM audit_records
       ORDER BY occurred_at ASC`,
    );
    expect(audits.rows).toHaveLength(1);
    expect(audits.rows[0]).toMatchObject({
      action: 'health.measurement.import',
      outcome: 'success',
      error_code: null,
      metadata: { bridgeId, kind: 'steps' },
    });
    expect(JSON.stringify(audits.rows[0])).not.toContain('8432');
    expect(JSON.stringify(audits.rows[0])).not.toContain('"value"');

    const updatedBridge = await bridgeRepository.getById(bridgeId);
    expect(updatedBridge?.lastMeasurementAt).toEqual(new Date('2026-08-30T10:00:00Z'));
  });

  it('rejects a measurement kind outside bridge permissions and audits the failure', async () => {
    const raw: RawHealthMeasurement = {
      kind: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measuredAt: '2026-08-30T10:00:00Z',
      externalId: 'hr-1',
    };

    await expect(
      importHealthMeasurement(raw, bridge, dependencies('corr-kind-1')),
    ).rejects.toMatchObject({
      code: 'HEALTH_KIND_NOT_ALLOWED',
    });

    expect(await countRows('health_measurements')).toBe(0);
    expect(await countRows('outbox_events')).toBe(0);

    const audit = await pool.query<{
      outcome: string;
      error_code: string;
      correlation_id: string;
      metadata: Record<string, unknown>;
    }>('SELECT outcome, error_code, correlation_id, metadata FROM audit_records');
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      outcome: 'failure',
      error_code: 'HEALTH_KIND_NOT_ALLOWED',
      correlation_id: 'corr-kind-1',
      metadata: { bridgeId, kind: 'heart_rate' },
    });
    expect(JSON.stringify(audit.rows[0])).not.toContain('72');
    expect(JSON.stringify(audit.rows[0])).not.toContain('"value"');
  });

  it('audits invalid measurements without persisting health data', async () => {
    const invalid: RawHealthMeasurement = {
      kind: 'steps',
      value: 1.5,
      unit: 'count',
      measuredAt: '2026-08-30T10:00:00Z',
      externalId: 'invalid-steps-1',
    };

    await expect(
      importHealthMeasurement(invalid, bridge, dependencies('corr-invalid-1')),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(await countRows('health_measurements')).toBe(0);
    expect(await countRows('outbox_events')).toBe(0);

    const audit = await pool.query<{
      outcome: string;
      error_code: string;
      correlation_id: string;
      metadata: Record<string, unknown>;
    }>('SELECT outcome, error_code, correlation_id, metadata FROM audit_records');
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      outcome: 'failure',
      error_code: 'VALIDATION_ERROR',
      correlation_id: 'corr-invalid-1',
      metadata: { bridgeId, kind: 'steps' },
    });
    expect(JSON.stringify(audit.rows[0])).not.toContain('1.5');
    expect(JSON.stringify(audit.rows[0])).not.toContain('"value"');
  });
});
