# AGNES Core v1 Operations

This runbook covers the AGNES Core backend foundation and the Health Bridge ingestion/status infrastructure. It does not describe a final Health OS user interface, coaching flow, or medical interpretation.

## Runtime baseline

AGNES Core targets Node.js 24 and PostgreSQL 18-compatible deployments. Apply schema migrations in order before starting the application:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_health_bridge.sql
```

The server requires `DATABASE_URL` and `HEALTH_BRIDGE_ID`. `PORT` defaults to `3000` and `HOST` defaults to `0.0.0.0`.

## Health Bridge source model

HealthKit and Android Health Connect are device-local, permissioned sources. AGNES does not perform arbitrary server-side reads from either platform. A permitted device-side bridge reads data locally and submits accepted measurements to AGNES Core.

Supported providers are:

- `healthkit`
- `health_connect`

Supported canonical measurement pairs are:

| Kind | Unit |
| --- | --- |
| `steps` | `count` |
| `heart_rate` | `bpm` |
| `sleep` | `minutes` |
| `weight` | `kg` |
| `active_energy` | `kcal` |

Ownership fields (`householdId`, `personId`, provider, and source device) are taken from the authenticated bridge registration and are never trusted from the HTTP measurement body.

## Bridge registration and credentials

A bridge registration stores only a SHA-256 token hash in `health_bridges.token_hash`. The raw bearer token must be delivered through a secure provisioning channel to the device and must not be persisted in AGNES Core, committed to source control, or written to logs, audit records, or outbox payloads.

There is no public registration/credential-management HTTP endpoint in Core v1. Registration is an operator/provisioning responsibility. Each registration also constrains the allowed measurement kinds for that device/person.

To revoke a bridge, set its `auth_state` to `revoked` through the trusted operator path. Revoked and expired credentials are rejected by the Health Bridge authenticator.

To rotate a credential, generate a new high-entropy token through the trusted provisioning process, compute its SHA-256 hash before persistence, replace only `token_hash`, restore `auth_state='active'`, and deliver the new raw token to the device through the secure channel. The previous raw token must not be retained. Rotation should be treated as an atomic operational change: once the stored hash changes, the old token is no longer accepted.

## HTTP endpoints

The Health Bridge exposes:

- `POST /integrations/health/heartbeat` — authenticated bridge heartbeat; success is HTTP 204.
- `POST /integrations/health/measurements` — authenticated canonical measurement ingestion; a new record returns HTTP 201 and an idempotent retry returns HTTP 200.
- `GET /integrations/health/status` — authenticated bridge freshness/authentication status without raw health values.
- `GET /integrations/status` — normalized connector summary used by presentation clients for the truthful live counter.
- `GET /health` — process health probe.

Health requests use `Authorization: Bearer <device-token>`. The raw bearer token is hashed before repository lookup.

## Truthful status semantics

Default Health Bridge windows are:

- measurement freshness: 24 hours
- heartbeat freshness: 6 hours
- degraded grace: 48 hours
- maximum future measurement skew: 5 minutes
- maximum import age: 30 days

They can be overridden with positive finite values through:

```text
HEALTH_MEASUREMENT_FRESH_HOURS
HEALTH_HEARTBEAT_FRESH_HOURS
HEALTH_DEGRADED_GRACE_HOURS
HEALTH_MAX_FUTURE_SKEW_MINUTES
HEALTH_MAX_IMPORT_AGE_DAYS
```

Explicit zero, negative, empty, non-numeric, or infinite values fail startup rather than silently falling back.

Health-specific `live` is normalized to generic connector state `connected`. The presentation semantics are:

| Generic state | Meaning |
| --- | --- |
| `connected` | A valid measurement is within the configured measurement-freshness window. This is the only Health Bridge state counted as LIVE. |
| `connected_no_data` | The bridge has recent authenticated activity but no fresh accepted measurement. It is connected but not live. Presentation label: `CONNECTED · NO DATA TODAY`. |
| `degraded` | The last bridge activity is older than the heartbeat freshness window but still inside the degraded grace window. |
| `auth_expired` | The bridge credential registration is not active (`expired` or `revoked`). |
| `disconnected` | The bridge is absent or its last known activity is beyond the degraded grace window. |
| `error` | Reserved generic connector state for an operational connector failure. The current Health status state machine does not synthesize `error` from missing measurements. |

`connected_no_data` must never increase the live counter. A heartbeat alone can never make Health LIVE.

## Idempotency and event privacy

Measurement imports are replay-safe. A canonical dedupe key prevents an identical logical measurement from creating multiple records. A successful first import emits one `health.measurement.imported.v1` outbox event; an unchanged retry emits no second import event.

Canonical measurement values are stored in `health_measurements` because they are the health data being ingested. Audit and outbox payloads intentionally contain identifiers, kind, provider, and timestamps only. They must not contain the raw measurement value or raw bearer token. Default Fastify request logging must not be extended to log authorization headers or request bodies for Health Bridge routes.

## Verification

The repository currently has no committed `package-lock.json`, so `npm ci` is not valid yet. Until a dependency lockfile is deliberately introduced and reviewed, use the same install path as CI:

```bash
npm install
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_health_bridge.sql
npm run lint
npm test
npm run build
npm run format:check
```

The end-to-end Health Bridge test creates its own temporary PostgreSQL database, applies both real migrations, proves `connected_no_data -> connected` only after a real accepted measurement, verifies retry idempotency, and removes the temporary database after the test.

A future dependency-locking change should commit `package-lock.json` and switch both this runbook and Core CI from `npm install` to `npm ci` in the same reviewed change.
