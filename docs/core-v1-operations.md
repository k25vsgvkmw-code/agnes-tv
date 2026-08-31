# AGNES Core v1 Operations

## Runtime

AGNES Core v1 targets Node.js 24 and PostgreSQL 18 in production CI.

Required environment variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `PORT` — optional HTTP port; defaults to `3000`.

## Database migration

Apply the Core v1 schema before starting the service:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
```

The migration creates the canonical household, people, calendar, external-reference and transactional-outbox tables used by the first vertical slice.

## Verification

Install from the lockfile and run all quality gates:

```bash
npm ci
npm run lint
npm run build
npm test
npm test -- tests/e2e/calendar-to-notification.test.ts
npm run format:check
```

The E2E test verifies the calendar-provider → canonical event → transactional outbox → materialized context → late-departure situation → policy/decision → verified notification → acknowledgement/audit chain. It also covers duplicate provider retries and failed notification delivery.

## Connector health

All external providers must enter through the Connector framework and registry. Connector health states are `connected`, `degraded`, `auth_expired`, `rate_limited`, `error`, and `disconnected`. Provider records must be normalized before entering domain logic.

## Transactional outbox

Canonical database changes and their domain events are committed atomically. The outbox worker claims pending records, publishes to the domain bus, and marks an event published only after successful publication. Failures are returned to `pending` with an exponential retry timestamp and the last error retained for diagnosis.

## AI fallback

Core correctness never depends on a model provider. `UnavailableModelGateway` returns the typed `MODEL_UNAVAILABLE` result instead of throwing. Deterministic context, situations, permissions, notifications, persistence, and automations must continue operating while model access is unavailable.

## Failure semantics

AGNES must never report an external side effect as successful merely because an attempt was made. Notification state moves to `delivered` only after a delivery adapter returns a verified receipt. Acknowledgement is accepted only for delivered notifications and writes an audit record using the same correlation chain.

## Operational checks

When investigating a failure, verify in order:

1. PostgreSQL health and migration state.
2. Connector registry health and authentication state.
3. Pending/processing outbox rows, retry time and last error.
4. Domain-event publication and context materialization.
5. Notification provider receipt before considering delivery successful.
6. Audit correlation IDs for acknowledged material actions.

The production GitHub Actions workflow is `.github/workflows/core-ci.yml` and must remain green before Core v1 is considered releasable.
