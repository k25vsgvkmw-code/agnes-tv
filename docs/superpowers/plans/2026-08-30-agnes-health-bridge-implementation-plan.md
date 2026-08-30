# AGNES Health Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-grade, device-originated Health Bridge that ingests authorized HealthKit/Health Connect measurements, normalizes and deduplicates them, persists canonical health state, emits durable events, and reports truthful connector health without configuration-only `LIVE` shortcuts.

**Architecture:** HealthKit and Health Connect remain device-side authoritative sources. A registered device bridge authenticates to AGNES, pushes only authorized measurements through Fastify transport, and provider payloads are normalized before domain logic. PostgreSQL stores bridge registrations and canonical measurements; imports use the existing transactional-outbox pattern; health status is derived from authentication state plus measurement/heartbeat freshness and is exposed through the connector registry and transport contracts.

**Tech Stack:** Node.js 24 LTS, TypeScript 6, npm 11, Fastify 5, PostgreSQL 18-compatible SQL, `pg`, Zod 4, Vitest 3, Node `crypto`.

**Spec:** `docs/superpowers/specs/2026-08-30-agnes-health-bridge-design.md`

## Global Constraints

- This plan layers on the greenfield AGNES Core. Core plan Tasks 1–8 and 13–16 must exist before executing Health Bridge tasks; if those files are absent, execute the Core plan first rather than re-creating parallel infrastructure.
- Do not inherit or reintroduce legacy AGNES TV/WordPress UI architecture into the greenfield core.
- HealthKit and Health Connect are authoritative; AGNES never claims direct server access to either source without a device bridge.
- Supported v1 kinds are exactly: `steps`, `heart_rate`, `sleep`, `weight`, `active_energy`.
- Canonical v1 units are exactly: `count`, `bpm`, `minutes`, `kg`, `kcal` respectively.
- Default measurement freshness is 24 hours; heartbeat freshness is 6 hours; degraded grace is 48 hours. These defaults are configuration values, not scattered domain constants.
- A connector is `LIVE` only when a registered/authenticated bridge has a valid measurement inside the measurement freshness window.
- A recent heartbeat without a fresh measurement is `CONNECTED_NO_DATA`, rendered as `CONNECTED · NO DATA TODAY`, and is not counted as live.
- No fake/sample/configuration-only measurement may produce `LIVE`.
- Health ingestion is per-person and per-bridge. The HTTP payload must not be allowed to override the authenticated registration's household, person, provider, or device identity.
- Raw bearer tokens are never persisted or logged; only SHA-256 token hashes are stored.
- Raw provider metadata may cross the normalization boundary only as provenance metadata; domain decision code must not consume provider-specific payloads.
- Measurement import is idempotent. New logical measurements emit exactly one `health.measurement.imported.v1` durable event; retries of the same logical measurement emit none.
- Health data is sensitive. Use least privilege, parameterized SQL, encrypted transport at deployment, structured audit entries, and no raw health payloads in logs.
- No medical diagnosis, clinical interpretation, nutrition coaching, workout coaching, charts, or Health OS UI is added in this slice.
- Every production behavior change follows TDD: failing test, verify expected failure, minimal implementation, verify pass, then commit.

## File Structure

```text
src/
  health/
    health-config.ts                    # typed freshness/import policy configuration
    health-measurement.ts               # canonical measurement model + validation contract
    health-normalizer.ts                # provider-neutral normalization + deterministic dedupe key
    health-bridge.ts                    # bridge registration/auth state model
    health-repositories.ts              # health measurement/bridge persistence ports
    health-status-service.ts            # deterministic LIVE/NO_DATA/DEGRADED/etc state machine
    import-health-measurement.ts        # idempotent normalization/persist/outbox use case
    record-health-heartbeat.ts          # heartbeat application use case
    health-authenticator.ts             # bearer token hashing and registration authentication
  integrations/
    connector.ts                        # extend generic health states with connected_no_data
    connector-summary.ts                # aggregate connector status; count true live only
    health/
      health-connector.ts               # Connector adapter backed by HealthStatusService
  persistence/
    migrations/002_health_bridge.sql    # health bridge/measurement schema
    postgres-health-bridge-repository.ts
    postgres-health-measurement-repository.ts
  transport/
    health-routes.ts                    # heartbeat, measurement ingestion, health status
    integration-status-routes.ts        # normalized connector summary for presentation clients
  app/
    build-app.ts                        # wire health repositories/services/connector/routes
    server.ts                           # read health config from environment

tests/
  unit/
    health-normalizer.test.ts
    health-status-service.test.ts
    health-authenticator.test.ts
    health-connector-summary.test.ts
  integration/
    postgres-health-repositories.test.ts
    import-health-measurement.test.ts
    health-routes.test.ts
  e2e/
    health-bridge-live.test.ts
```

---

### Task 1: Canonical Health Measurement and Normalization

**Files:**
- Create: `src/health/health-config.ts`
- Create: `src/health/health-measurement.ts`
- Create: `src/health/health-normalizer.ts`
- Test: `tests/unit/health-normalizer.test.ts`

**Interfaces:**
- Consumes: `HouseholdId`, `PersonId`, `Clock` from Core kernel.
- Produces: `HealthKind`, `HealthUnit`, `HealthProvider`, `HealthMeasurement`, `RawHealthMeasurement`, `normalizeHealthMeasurement(input, context)`, `HealthConfig`.

- [ ] **Step 1: Write the failing normalization tests**

```ts
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { normalizeHealthMeasurement } from '../../src/health/health-normalizer.js';

const clock = new FixedClock(new Date('2026-08-30T12:00:00Z'));
const context = {
  householdId: 'household-1',
  personId: 'person-1',
  provider: 'health_connect' as const,
  sourceDeviceId: 'pixel-1',
  clock,
  config: {
    measurementFreshnessMs: 24 * 60 * 60 * 1000,
    heartbeatFreshnessMs: 6 * 60 * 60 * 1000,
    degradedGraceMs: 48 * 60 * 60 * 1000,
    maxFutureSkewMs: 5 * 60 * 1000,
    maxImportAgeMs: 30 * 24 * 60 * 60 * 1000
  }
};

it('normalizes steps into the canonical contract', () => {
  const result = normalizeHealthMeasurement({
    kind: 'steps',
    value: 8432,
    unit: 'count',
    measuredAt: '2026-08-30T10:00:00Z',
    externalId: 'hc-steps-42'
  }, context);

  expect(result.kind).toBe('steps');
  expect(result.unit).toBe('count');
  expect(result.sourceProvider).toBe('health_connect');
  expect(result.dedupeKey).toMatch(/^[a-f0-9]{64}$/);
});

it('rejects an invalid unit for heart rate', () => {
  expect(() => normalizeHealthMeasurement({
    kind: 'heart_rate',
    value: 72,
    unit: 'kg',
    measuredAt: '2026-08-30T10:00:00Z',
    externalId: 'hr-1'
  }, context)).toThrow('heart_rate requires bpm');
});
```

Add one positive test for each remaining kind and explicit rejection tests for invalid ranges and timestamps.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- tests/unit/health-normalizer.test.ts
```

Expected: FAIL because the health modules do not exist.

- [ ] **Step 3: Implement typed configuration**

`src/health/health-config.ts`:

```ts
export interface HealthConfig {
  readonly measurementFreshnessMs: number;
  readonly heartbeatFreshnessMs: number;
  readonly degradedGraceMs: number;
  readonly maxFutureSkewMs: number;
  readonly maxImportAgeMs: number;
}

export const defaultHealthConfig: HealthConfig = {
  measurementFreshnessMs: 24 * 60 * 60 * 1000,
  heartbeatFreshnessMs: 6 * 60 * 60 * 1000,
  degradedGraceMs: 48 * 60 * 60 * 1000,
  maxFutureSkewMs: 5 * 60 * 1000,
  maxImportAgeMs: 30 * 24 * 60 * 60 * 1000
};
```

- [ ] **Step 4: Implement canonical types and validation rules**

Use these exact v1 pairings and numeric bounds:

```ts
export type HealthProvider = 'healthkit' | 'health_connect';
export type HealthKind = 'steps' | 'heart_rate' | 'sleep' | 'weight' | 'active_energy';
export type HealthUnit = 'count' | 'bpm' | 'minutes' | 'kg' | 'kcal';

const rules = {
  steps:        { unit: 'count',   min: 0,  max: 200_000, integer: true },
  heart_rate:   { unit: 'bpm',     min: 20, max: 250,     integer: false },
  sleep:        { unit: 'minutes', min: 0,  max: 1_440,   integer: false },
  weight:       { unit: 'kg',      min: 1,  max: 500,     integer: false },
  active_energy:{ unit: 'kcal',    min: 0,  max: 20_000,  integer: false }
} as const;
```

`HealthMeasurement` must include `id`, `householdId`, `personId`, `kind`, `value`, `unit`, `measuredAt`, `sourceProvider`, `sourceDeviceId`, optional `externalId`, `dedupeKey`, `receivedAt`, and opaque `metadata`.

- [ ] **Step 5: Implement deterministic deduplication**

If `externalId` exists, hash this exact string:

```text
provider|deviceId|externalId
```

Otherwise hash:

```text
householdId|personId|kind|measuredAtISO|normalizedValue|unit|provider|deviceId
```

Use `createHash('sha256').update(material).digest('hex')`.

Reject timestamps newer than `clock.now() + maxFutureSkewMs` or older than `clock.now() - maxImportAgeMs`.

- [ ] **Step 6: Run GREEN and build**

Run:

```bash
npm run build
npm test -- tests/unit/health-normalizer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/health/health-config.ts src/health/health-measurement.ts src/health/health-normalizer.ts tests/unit/health-normalizer.test.ts
git commit -m "feat: normalize canonical health measurements"
```

---

### Task 2: Bridge Registration Model and Deterministic Status State Machine

**Files:**
- Create: `src/health/health-bridge.ts`
- Create: `src/health/health-repositories.ts`
- Create: `src/health/health-status-service.ts`
- Test: `tests/unit/health-status-service.test.ts`

**Interfaces:**
- Consumes: `Clock`, `HealthConfig`, canonical IDs.
- Produces: `HealthBridgeRegistration`, `HealthBridgeStatus`, `HealthBridgeRepository`, `HealthMeasurementRepository`, `HealthStatusService.getStatus(bridgeId)`.

- [ ] **Step 1: Write failing state-transition tests**

```ts
it('returns connected_no_data for a recent heartbeat without a fresh measurement', async () => {
  bridgeRepo.seed({
    id: 'bridge-1', authState: 'active',
    lastHeartbeatAt: new Date('2026-08-30T11:00:00Z'),
    lastMeasurementAt: null
  });

  expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'connected_no_data' });
});

it('returns live when a valid measurement is fresh', async () => {
  bridgeRepo.seed({
    id: 'bridge-1', authState: 'active',
    lastHeartbeatAt: new Date('2026-08-30T01:00:00Z'),
    lastMeasurementAt: new Date('2026-08-30T10:30:00Z')
  });

  expect(await service.getStatus('bridge-1')).toMatchObject({ state: 'live' });
});
```

Also test: expired auth -> `auth_expired`; last activity 6–48 hours old with no fresh measurement -> `degraded`; last activity older than 48 hours -> `disconnected`; unknown bridge -> `disconnected`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/health-status-service.test.ts`

Expected: FAIL because bridge/status modules do not exist.

- [ ] **Step 3: Implement bridge registration and repository ports**

```ts
export type HealthBridgeAuthState = 'active' | 'expired' | 'revoked';

export interface HealthBridgeRegistration {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly provider: HealthProvider;
  readonly sourceDeviceId: string;
  readonly tokenHash: string;
  readonly allowedKinds: readonly HealthKind[];
  readonly authState: HealthBridgeAuthState;
  readonly lastHeartbeatAt: Date | null;
  readonly lastMeasurementAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

`HealthBridgeRepository` must expose `getById`, `getByTokenHash`, `save`, `recordHeartbeat`, and `recordMeasurementSeen`. `HealthMeasurementRepository` must expose `insertIfAbsent(measurement)` returning `{ measurement, change: 'created' | 'unchanged' }` and `getLatestMeasuredAt(bridgeId)`.

- [ ] **Step 4: Implement status precedence exactly**

1. unknown bridge -> `disconnected`
2. `authState !== 'active'` -> `auth_expired`
3. fresh `lastMeasurementAt` within 24h -> `live`
4. otherwise if `max(lastHeartbeatAt,lastMeasurementAt)` is within 6h -> `connected_no_data`
5. otherwise if last activity is within 48h -> `degraded`
6. otherwise -> `disconnected`

Return structured fields `{ state, lastHeartbeatAt, lastMeasurementAt, evaluatedAt }`.

- [ ] **Step 5: Run GREEN/build**

Run:

```bash
npm run build
npm test -- tests/unit/health-status-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/health/health-bridge.ts src/health/health-repositories.ts src/health/health-status-service.ts tests/unit/health-status-service.test.ts
git commit -m "feat: derive truthful health bridge status"
```

---

### Task 3: PostgreSQL Health Bridge and Measurement Persistence

**Files:**
- Create: `src/persistence/migrations/002_health_bridge.sql`
- Create: `src/persistence/postgres-health-bridge-repository.ts`
- Create: `src/persistence/postgres-health-measurement-repository.ts`
- Test: `tests/integration/postgres-health-repositories.test.ts`

**Interfaces:**
- Consumes: `pg.Pool`, `HealthBridgeRepository`, `HealthMeasurementRepository`.
- Produces: PostgreSQL adapters with unique measurement deduplication and bridge freshness updates.

- [ ] **Step 1: Write the failing persistence tests**

```ts
it('stores a logical measurement only once by dedupe key', async () => {
  const first = await measurementRepo.insertIfAbsent(measurement);
  const second = await measurementRepo.insertIfAbsent(measurement);

  expect(first.change).toBe('created');
  expect(second.change).toBe('unchanged');
  expect(second.measurement.id).toBe(first.measurement.id);
});
```

Add tests that a bridge can be found by token hash and that `recordHeartbeat()`/`recordMeasurementSeen()` advance timestamps without changing ownership/provider fields.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
psql "$DATABASE_URL" -f src/persistence/migrations/001_core.sql
npm test -- tests/integration/postgres-health-repositories.test.ts
```

Expected: FAIL because `002_health_bridge.sql` and repositories do not exist.

- [ ] **Step 3: Create the migration**

`health_bridges` must contain bridge id, household/person foreign keys, provider, source device id, token hash, allowed kinds JSONB, auth state, heartbeat/measurement timestamps, created/updated timestamps, with unique constraints on `token_hash` and `(household_id, person_id, provider, source_device_id)`.

`health_measurements` must contain canonical fields, `bridge_id`, JSONB metadata, and a non-null unique `dedupe_key`. Add indexes on `(person_id, measured_at DESC)` and `(bridge_id, measured_at DESC)`.

- [ ] **Step 4: Implement parameterized PostgreSQL adapters**

`insertIfAbsent()` must use `INSERT ... ON CONFLICT (dedupe_key) DO NOTHING`, then fetch the existing row when no insert occurred. No caller should need to catch a uniqueness exception for normal retries.

- [ ] **Step 5: Apply migration and verify GREEN**

Run:

```bash
psql "$DATABASE_URL" -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -f src/persistence/migrations/002_health_bridge.sql
npm test -- tests/integration/postgres-health-repositories.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/persistence/migrations/002_health_bridge.sql src/persistence/postgres-health-bridge-repository.ts src/persistence/postgres-health-measurement-repository.ts tests/integration/postgres-health-repositories.test.ts
git commit -m "feat: persist health bridge measurements"
```

---

### Task 4: Idempotent Measurement Import with Outbox and Audit

**Files:**
- Create: `src/health/import-health-measurement.ts`
- Modify: `src/audit/audit-record.ts` only if needed to add health action names without changing existing semantics.
- Test: `tests/integration/import-health-measurement.test.ts`

**Interfaces:**
- Consumes: `HealthMeasurementRepository`, `HealthBridgeRepository`, `OutboxRepository`, `AuditRepository`, `Clock`, `normalizeHealthMeasurement()`.
- Produces: `importHealthMeasurement(raw, bridge, deps)` and durable `health.measurement.imported.v1` events.

- [ ] **Step 1: Write the failing idempotency test**

```ts
it('emits one import event when the device retries the same logical measurement', async () => {
  const first = await importer.import(rawMeasurement, bridge);
  const second = await importer.import(rawMeasurement, bridge);

  expect(first.change).toBe('created');
  expect(second.change).toBe('unchanged');
  expect(await readOutboxEvents('health.measurement.imported.v1')).toHaveLength(1);
});
```

Add a test that a measurement kind outside `bridge.allowedKinds` is rejected and produces one audit failure entry without persisting a measurement.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/integration/import-health-measurement.test.ts`

Expected: FAIL because the importer does not exist.

- [ ] **Step 3: Implement the import transaction**

Inside one application transaction:

1. verify `raw.kind` is in `bridge.allowedKinds`;
2. normalize using ownership/provider/device fields from the bridge, never from the request body;
3. `insertIfAbsent()` measurement;
4. when `change === 'unchanged'`, return existing canonical record without outbox emission;
5. `recordMeasurementSeen(bridge.id, measurement.measuredAt)`;
6. append one `AgnesEvent` named `health.measurement.imported.v1` with canonical identifiers/kind/timestamps, not raw provider payload;
7. append a structured audit success entry;
8. commit.

For validation/authorization rejection, append an audit failure entry containing error code, bridge id, kind, and correlation id, but never raw health values or bearer token.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/integration/import-health-measurement.test.ts`

Expected: PASS for create, retry, disallowed-kind, and invalid-measurement cases.

- [ ] **Step 5: Commit**

```bash
git add src/health/import-health-measurement.ts src/audit/audit-record.ts tests/integration/import-health-measurement.test.ts
git commit -m "feat: import health measurements idempotently"
```

---

### Task 5: Bridge Authentication and Heartbeat Application Flow

**Files:**
- Create: `src/health/health-authenticator.ts`
- Create: `src/health/record-health-heartbeat.ts`
- Test: `tests/unit/health-authenticator.test.ts`

**Interfaces:**
- Consumes: `HealthBridgeRepository`, `Clock`.
- Produces: `hashHealthBridgeToken(token)`, `HealthBridgeAuthenticator.authenticate(token)`, `recordHealthHeartbeat(bridge, deps)`.

- [ ] **Step 1: Write failing authentication tests**

```ts
it('authenticates by SHA-256 token hash without storing the raw token', async () => {
  const rawToken = 'device-token-123';
  repo.seed({ tokenHash: hashHealthBridgeToken(rawToken), authState: 'active' });

  const bridge = await authenticator.authenticate(rawToken);
  expect(bridge?.id).toBe('bridge-1');
  expect(JSON.stringify(bridge)).not.toContain(rawToken);
});

it('rejects expired bridge credentials', async () => {
  repo.seed({ tokenHash: hashHealthBridgeToken('expired'), authState: 'expired' });
  await expect(authenticator.authenticate('expired')).rejects.toMatchObject({ code: 'HEALTH_AUTH_EXPIRED' });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/health-authenticator.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement token hashing/authentication**

Use exactly:

```ts
createHash('sha256').update(token, 'utf8').digest('hex')
```

Reject empty/missing tokens before hashing. Look up the bridge by hash. Return a typed unauthorized error for unknown tokens and a typed expired error for non-active registrations.

- [ ] **Step 4: Implement heartbeat use case**

`recordHealthHeartbeat()` updates only `lastHeartbeatAt` and `updatedAt` using injected `Clock`. It emits no `health.measurement.imported.v1` event and cannot make status `live` by itself.

- [ ] **Step 5: Run GREEN/build**

Run:

```bash
npm run build
npm test -- tests/unit/health-authenticator.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/health/health-authenticator.ts src/health/record-health-heartbeat.ts tests/unit/health-authenticator.test.ts
git commit -m "feat: authenticate health device bridges"
```

---

### Task 6: Fastify Health Transport Endpoints

**Files:**
- Create: `src/transport/health-routes.ts`
- Test: `tests/integration/health-routes.test.ts`

**Interfaces:**
- Consumes: `HealthBridgeAuthenticator`, measurement importer, heartbeat use case, `HealthStatusService`.
- Produces: `POST /integrations/health/heartbeat`, `POST /integrations/health/measurements`, `GET /integrations/health/status`.

- [ ] **Step 1: Write failing route tests**

```ts
it('reports connected_no_data after an authenticated heartbeat with no measurement', async () => {
  await app.inject({
    method: 'POST',
    url: '/integrations/health/heartbeat',
    headers: { authorization: 'Bearer device-token-123' }
  });

  const status = await app.inject({
    method: 'GET',
    url: '/integrations/health/status',
    headers: { authorization: 'Bearer device-token-123' }
  });

  expect(status.statusCode).toBe(200);
  expect(status.json()).toMatchObject({ state: 'connected_no_data' });
});
```

Add tests for 401 missing/unknown token, successful measurement import, duplicate import response, invalid unit 400, and status becoming `live` only after a valid fresh measurement.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/integration/health-routes.test.ts`

Expected: FAIL because routes are absent.

- [ ] **Step 3: Define request schema without ownership fields**

Measurement body accepts only:

```ts
{
  kind: 'steps' | 'heart_rate' | 'sleep' | 'weight' | 'active_energy';
  value: number;
  unit: 'count' | 'bpm' | 'minutes' | 'kg' | 'kcal';
  measuredAt: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}
```

Do not accept `householdId`, `personId`, `provider`, or `sourceDeviceId` from HTTP input. Those values come exclusively from the authenticated bridge registration.

- [ ] **Step 4: Implement route behavior**

- heartbeat success: HTTP 204
- new measurement: HTTP 201 with `{ id, change: 'created' }`
- duplicate measurement: HTTP 200 with existing `{ id, change: 'unchanged' }`
- validation failure: HTTP 400 structured error
- missing/invalid/expired bearer credential: HTTP 401 structured error
- status: HTTP 200 with state/freshness timestamps only; do not echo token or raw measurement values

- [ ] **Step 5: Run GREEN/build**

Run:

```bash
npm run build
npm test -- tests/integration/health-routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/transport/health-routes.ts tests/integration/health-routes.test.ts
git commit -m "feat: expose authenticated health bridge routes"
```

---

### Task 7: Connector Registry Integration and Truthful Live Counter

**Files:**
- Modify: `src/integrations/connector.ts`
- Create: `src/integrations/connector-summary.ts`
- Create: `src/integrations/health/health-connector.ts`
- Create: `src/transport/integration-status-routes.ts`
- Test: `tests/unit/health-connector-summary.test.ts`

**Interfaces:**
- Consumes: generic `Connector`, `ConnectorRegistry`, `HealthStatusService`.
- Produces: generic `connected_no_data` state, `HealthConnector`, `summarizeConnectorHealth()`, `GET /integrations/status`.

- [ ] **Step 1: Write failing connector-summary tests**

```ts
it('does not count connected_no_data as live', async () => {
  registry.register(fakeConnector('weather', 'connected'));
  registry.register(fakeConnector('health', 'connected_no_data'));

  const summary = await summarizeConnectorHealth(registry, ['weather', 'health']);
  expect(summary).toMatchObject({ total: 2, live: 1 });
});
```

Add mapping tests proving `HealthBridgeStatus.live -> ConnectorHealth.connected` and `HealthBridgeStatus.connected_no_data -> ConnectorHealth.connected_no_data`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/health-connector-summary.test.ts`

Expected: FAIL because generic connector state does not yet support `connected_no_data` and the health adapter is absent.

- [ ] **Step 3: Extend generic connector health state**

Allowed states become exactly:

```ts
type ConnectorHealthState =
  | 'connected'
  | 'connected_no_data'
  | 'degraded'
  | 'auth_expired'
  | 'rate_limited'
  | 'error'
  | 'disconnected';
```

Existing connectors remain unchanged; only state `connected` counts toward the live counter.

- [ ] **Step 4: Implement HealthConnector and summary service**

`HealthConnector.health()` maps health-specific states to generic states. Its capabilities are read-only/realtime ingestion metadata; it must not implement arbitrary server-side HealthKit/Health Connect reads.

`summarizeConnectorHealth()` returns `{ total, live, items }`; `live` is the number of items whose generic state is exactly `connected`.

- [ ] **Step 5: Add normalized integration-status route**

`GET /integrations/status` returns the connector summary for presentation clients. The endpoint may render labels client-side; backend state remains canonical (`connected`, `connected_no_data`, etc.).

- [ ] **Step 6: Run GREEN/build**

Run:

```bash
npm run build
npm test -- tests/unit/connector-registry.test.ts tests/unit/health-connector-summary.test.ts
```

Expected: both existing and new connector tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/integrations/connector.ts src/integrations/connector-summary.ts src/integrations/health/health-connector.ts src/transport/integration-status-routes.ts tests/unit/health-connector-summary.test.ts
git commit -m "feat: integrate truthful health connector status"
```

---

### Task 8: Composition, Configuration, and End-to-End Health Bridge Proof

**Files:**
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Create: `tests/e2e/health-bridge-live.test.ts`

**Interfaces:**
- Consumes: PostgreSQL adapters, outbox, audit, connector registry, routes, `HealthConfig`.
- Produces: fully wired Health Bridge and an E2E proof from authenticated device request to live connector status.

- [ ] **Step 1: Write the failing E2E test**

The test must execute this exact sequence:

```ts
it('moves health from connected_no_data to live only after a real accepted measurement', async () => {
  // 1. seed household + person
  // 2. seed active health bridge with SHA-256 token hash and allowed kind 'steps'
  // 3. POST heartbeat with bearer token
  // 4. GET health status -> connected_no_data
  // 5. GET integration summary -> health not counted live
  // 6. POST one valid steps measurement
  // 7. repeat the identical POST
  // 8. assert one canonical measurement row
  // 9. assert one health.measurement.imported.v1 outbox event
  // 10. GET health status -> live
  // 11. GET integration summary -> live count increased by exactly one
  // 12. assert no raw token and no raw measurement value appears in audit/outbox payloads
});
```

- [ ] **Step 2: Run and verify RED**

Run with PostgreSQL:

```bash
npm test -- tests/e2e/health-bridge-live.test.ts
```

Expected: FAIL until composition is wired.

- [ ] **Step 3: Wire dependencies in `buildApp()`**

Instantiate concrete health repositories, authenticator, importer, status service, health connector, connector summary, and routes at the composition root. Register connector id `health` exactly once.

- [ ] **Step 4: Add environment parsing in `server.ts`**

Support optional environment overrides:

```text
HEALTH_MEASUREMENT_FRESH_HOURS=24
HEALTH_HEARTBEAT_FRESH_HOURS=6
HEALTH_DEGRADED_GRACE_HOURS=48
HEALTH_MAX_FUTURE_SKEW_MINUTES=5
HEALTH_MAX_IMPORT_AGE_DAYS=30
```

Reject non-positive/non-numeric values at startup; do not silently fall back after an explicitly invalid value.

- [ ] **Step 5: Run E2E GREEN**

Run:

```bash
psql "$DATABASE_URL" -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -f src/persistence/migrations/002_health_bridge.sql
npm test -- tests/e2e/health-bridge-live.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run complete quality gates**

Run:

```bash
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all commands exit 0 with no warnings caused by Health Bridge.

- [ ] **Step 7: Commit**

```bash
git add src/app/build-app.ts src/app/server.ts tests/e2e/health-bridge-live.test.ts
git commit -m "feat: wire AGNES Health Bridge end to end"
```

---

### Task 9: CI Migration and Operations Documentation

**Files:**
- Modify: `.github/workflows/core-ci.yml`
- Modify: `docs/core-v1-operations.md`
- Modify: `README.md`
- Test: CI workflow run after push.

**Interfaces:**
- Consumes: completed Health Bridge implementation.
- Produces: repeatable migration/test procedure and operator documentation.

- [ ] **Step 1: Update CI database setup**

After `001_core.sql`, CI must apply:

```bash
psql "$DATABASE_URL" -f src/persistence/migrations/002_health_bridge.sql
```

Then run the existing full lint/build/test/format gates.

- [ ] **Step 2: Document Health Bridge operations**

`docs/core-v1-operations.md` must document:

- bridge registration stores only token hash;
- supported providers/kinds/units;
- heartbeat and measurement endpoints;
- the 24h / 6h / 48h default status windows;
- exact meaning of `connected`, `connected_no_data`, `degraded`, `auth_expired`, `disconnected`, `error`;
- `connected_no_data` is not live and should display `CONNECTED · NO DATA TODAY`;
- how to rotate/revoke a bridge credential;
- migration command for `002_health_bridge.sql`;
- no raw health values/tokens in logs/audit/outbox payloads.

- [ ] **Step 3: Update README links**

README must link to the Health Bridge spec and this implementation plan and state explicitly that this is backend ingestion/status infrastructure, not the final Health OS UI.

- [ ] **Step 4: Verify locally**

Run:

```bash
npm ci
psql "$DATABASE_URL" -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -f src/persistence/migrations/002_health_bridge.sql
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/core-ci.yml docs/core-v1-operations.md README.md
git commit -m "docs: operationalize AGNES Health Bridge"
```

---

## Self-Review Result

- Spec coverage: canonical measurement model, HealthKit/Health Connect source model, authenticated device bridge, normalization, freshness, idempotency, deduplication, event emission, permissions-by-registration, truthful status semantics, connector summary, privacy constraints, routes, testing, and operations are all mapped to tasks above.
- Placeholder scan: no `TBD`, `TODO`, “similar to”, or unspecified implementation step remains.
- Type consistency: `HealthProvider`, `HealthKind`, `HealthConfig`, `HealthBridgeRegistration`, `HealthBridgeStatus`, repository method names, generic `connected_no_data`, and route paths are defined once and used consistently throughout the plan.
- Scope check: Health OS UI, coaching, medical interpretation, smartwatch-direct server access, and unrelated modules remain out of scope.
