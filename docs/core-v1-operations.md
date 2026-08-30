# AGNES Core v1 Operations

This runbook covers the first AGNES Core vertical slice: canonical household/calendar data, durable events, context projection, departure-risk detection, deterministic policy/decision logic, verified notification delivery, acknowledgement/audit, and AI-unavailable fallback behavior.

## Runtime requirements

- Node.js 24
- npm 11 or a compatible npm version supplied with Node 24
- PostgreSQL 18-compatible server
- `psql` for applying the Core migration

## Environment

Copy the example environment file and adjust values for the local machine:

```bash
cp .env.example .env
```

Core v1 uses these variables:

- `DATABASE_URL` — required PostgreSQL connection string.
- `PORT` — HTTP port for local startup; defaults to `3000` in the command below when unset.
- `NODE_ENV` — conventional runtime mode; `development` is the example value.

Load the local environment before running commands:

```bash
set -a
source .env
set +a
```

## Install and migrate

Install exactly the locked dependencies:

```bash
npm ci
```

Create the database named by `DATABASE_URL` if it does not already exist, then apply the idempotent Core v1 schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
```

The migration creates the canonical household, people, external-reference, calendar-event, and transactional-outbox structures used by Core v1.

## Build and local startup

Compile the strict TypeScript project:

```bash
npm run build
```

Core v1 currently exposes `buildServer()` rather than a separate process-launcher script. Start the compiled server with:

```bash
node --env-file=.env --input-type=module -e "import('./dist/app/server.js').then(async ({ buildServer }) => { const app = await buildServer(); await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) }); })"
```

Verify the transport boundary from another shell:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

Stop the process with `Ctrl-C`.

## Full local verification

Run the same quality gates required for Core v1 acceptance:

```bash
npm ci
npm run lint
npm run build
npm test
npm run format:check
```

The test suite includes the end-to-end calendar-to-notification slice, duplicate-provider retry behavior, delivery-provider failure behavior, PostgreSQL repository/outbox integration tests, context projection, policy/decision tests, connector tests, notification lifecycle tests, and AI fallback tests.

## Connector health states

Every connector reports one normalized health state plus an optional provider-specific message:

- `connected` — connector is available for its declared capabilities.
- `degraded` — connector is reachable but operating with reduced reliability or capability.
- `auth_expired` — stored authorization is no longer usable and re-authentication or credential refresh is required.
- `rate_limited` — the provider is throttling requests; normal operation should resume after the provider window permits it.
- `error` — the connector encountered a provider or connector-level error that is not represented by a more specific state.
- `disconnected` — the connector is not connected or is not registered for the requested operation.

Capabilities are explicit and independent from health: `read`, `write`, `subscribe`, `realtime`, `search`, and `execute`.

## Transactional outbox and retry behavior

AGNES-owned writes that emit domain events use the PostgreSQL transactional outbox. `OutboxWorker.runOnce(limit)` claims a bounded batch and processes each record independently.

On successful publication:

1. The worker publishes the event to the domain event bus.
2. Only after the bus accepts it does the repository mark the record published.

On publication failure:

1. The event remains unpublished.
2. The repository records the error and increments the attempt count.
3. The claim is released for a future attempt.
4. `available_at` is moved forward using exponential backoff.

The current default backoff is:

```text
retry delay = 1000 ms × 2^attempts
```

Using the attempt count on the claimed record means the first failure is retried after approximately 1 second, then 2 seconds, 4 seconds, and so on. A failed publication is never represented as published.

## AI-unavailable mode

Core v1 does not depend on a model provider for the deterministic calendar-to-notification slice. `UnavailableModelGateway` implements the same `ModelGateway` contract as a future provider adapter and returns a typed error:

```text
MODEL_UNAVAILABLE
```

It returns this result for intent extraction, constrained planning, summarization, and response generation. The current `buildServer()` intentionally wires `UnavailableModelGateway` by default, proving that canonical calendar import, durable event processing, context projection, deterministic situation detection, permission/decision logic, notification delivery, acknowledgement, and audit can operate without AI availability.

Do not replace this fallback with broad exception handling in domain modules. Model-provider adapters belong behind `ModelGateway`.

## Operational boundaries of Core v1

Core v1 proves the backend nervous-system slice only. It intentionally does not include final UI/UX, 3D/avatar work, Travel, Cooking, Sports, Finance, broad Smart Home functionality, or provider-specific production connectors. Those domains should consume the same canonical contracts and event/integration boundaries rather than bypassing them.

## CI

`.github/workflows/core-ci.yml` is the Core v1 acceptance workflow. On pull requests to `main` and pushes to `main`, it:

1. starts PostgreSQL 18;
2. installs locked dependencies with `npm ci`;
3. applies `src/persistence/migrations/001_core.sql` with `ON_ERROR_STOP`;
4. runs lint;
5. builds TypeScript;
6. runs the complete test suite;
7. checks formatting.

Core v1 should not be treated as accepted unless this workflow is green and the calendar-to-notification E2E suite passes.
