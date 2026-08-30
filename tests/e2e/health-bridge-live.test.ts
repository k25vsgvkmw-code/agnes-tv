import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashHealthBridgeToken } from '../../src/health/health-authenticator.js';
import { defaultHealthConfig } from '../../src/health/health-config.js';
import { FixedClock } from '../../src/kernel/clock.js';
import { buildApp } from '../../src/app/build-app.js';
import { createPostgresPool } from '../../src/persistence/postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for Health Bridge E2E tests');

const householdId = '81000000-0000-4000-8000-000000000001';
const personId = '81000000-0000-4000-8000-000000000002';
const bridgeId = '81000000-0000-4000-8000-000000000003';
const token = 'e2e-device-token-123';
const rawValue = 6543;
const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const pool = createPostgresPool(databaseUrl);

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  await pool.query(
    `INSERT INTO households (id, name, timezone, locale, status)
     VALUES ($1, 'AGNES E2E Home', 'Asia/Nicosia', 'el-CY', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [householdId],
  );
  await pool.query(
    `INSERT INTO people (id, household_id, display_name, role, locale, timezone, status)
     VALUES ($1, $2, 'E2E Person', 'parent', 'el-CY', 'Asia/Nicosia', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [personId, householdId],
  );
  await pool.query(
    `INSERT INTO health_bridges (
       id, household_id, person_id, provider, source_device_id, token_hash,
       allowed_kinds, auth_state, created_at, updated_at
     ) VALUES ($1, $2, $3, 'health_connect', 'e2e-device', $4, '["steps"]'::jsonb, 'active', $5, $5)
     ON CONFLICT (id) DO UPDATE SET
       token_hash = EXCLUDED.token_hash,
       allowed_kinds = EXCLUDED.allowed_kinds,
       auth_state = 'active',
       last_heartbeat_at = NULL,
       last_measurement_at = NULL,
       updated_at = EXCLUDED.updated_at`,
    [bridgeId, householdId, personId, hashHealthBridgeToken(token), clock.now()],
  );

  app = await buildApp({
    databaseUrl,
    healthBridgeId: bridgeId,
    healthConfig: defaultHealthConfig,
    clock,
    logger: false,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM health_measurements WHERE bridge_id = $1', [bridgeId]);
  await pool.query('DELETE FROM audit_records WHERE household_id = $1', [householdId]);
  await pool.query('DELETE FROM outbox_events WHERE event_payload ->> \'householdId\' = $1', [householdId]);
  await pool.query('DELETE FROM health_bridges WHERE id = $1', [bridgeId]);
  await pool.query('DELETE FROM people WHERE id = $1', [personId]);
  await pool.query('DELETE FROM households WHERE id = $1', [householdId]);
  await pool.end();
});

describe('Health Bridge end-to-end live proof', () => {
  it('moves health from connected_no_data to live only after a real accepted measurement', async () => {
    const authorization = { authorization: `Bearer ${token}` };

    const heartbeat = await app.inject({
      method: 'POST',
      url: '/integrations/health/heartbeat',
      headers: authorization,
    });
    expect(heartbeat.statusCode).toBe(204);

    const noDataStatus = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization,
    });
    expect(noDataStatus.statusCode).toBe(200);
    expect(noDataStatus.json()).toMatchObject({ state: 'connected_no_data' });

    const beforeSummary = await app.inject({ method: 'GET', url: '/integrations/status' });
    expect(beforeSummary.statusCode).toBe(200);
    expect(beforeSummary.json()).toMatchObject({ total: 1, live: 0 });
    expect(beforeSummary.json().items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'health', state: 'connected_no_data' })]),
    );

    const payload = {
      kind: 'steps',
      value: rawValue,
      unit: 'count',
      measuredAt: '2026-08-30T11:30:00Z',
      externalId: 'e2e-steps-1',
    };

    const firstImport = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization,
      payload,
    });
    const retryImport = await app.inject({
      method: 'POST',
      url: '/integrations/health/measurements',
      headers: authorization,
      payload,
    });

    expect(firstImport.statusCode).toBe(201);
    expect(firstImport.json()).toMatchObject({ change: 'created' });
    expect(retryImport.statusCode).toBe(200);
    expect(retryImport.json()).toEqual({ id: firstImport.json().id, change: 'unchanged' });

    const measurementRows = await pool.query<{ count: string }>(
      'SELECT count(*) FROM health_measurements WHERE bridge_id = $1',
      [bridgeId],
    );
    expect(Number(measurementRows.rows[0]?.count ?? 0)).toBe(1);

    const outboxRows = await pool.query<{ event_payload: unknown }>(
      `SELECT event_payload FROM outbox_events
       WHERE event_type = 'health.measurement.imported.v1'
         AND event_payload ->> 'householdId' = $1`,
      [householdId],
    );
    expect(outboxRows.rowCount).toBe(1);

    const liveStatus = await app.inject({
      method: 'GET',
      url: '/integrations/health/status',
      headers: authorization,
    });
    expect(liveStatus.statusCode).toBe(200);
    expect(liveStatus.json()).toMatchObject({ state: 'live' });

    const afterSummary = await app.inject({ method: 'GET', url: '/integrations/status' });
    expect(afterSummary.statusCode).toBe(200);
    expect(afterSummary.json()).toMatchObject({ total: 1, live: 1 });
    expect(afterSummary.json().items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'health', state: 'connected' })]),
    );

    const auditRows = await pool.query<{ metadata: unknown }>(
      'SELECT metadata FROM audit_records WHERE household_id = $1',
      [householdId],
    );
    const privacyProof = JSON.stringify({ outbox: outboxRows.rows, audit: auditRows.rows });
    expect(privacyProof).not.toContain(token);
    expect(privacyProof).not.toContain(String(rawValue));
  });
});
