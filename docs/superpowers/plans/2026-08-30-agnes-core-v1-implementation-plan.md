# AGNES Core v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-grade AGNES Core vertical slice from canonical household/calendar data through durable events, context, situation detection, policy/decision logic, notification delivery, acknowledgement, audit, and AI-independent fallback behavior.

**Architecture:** Implement AGNES as a modular TypeScript application with framework-free domain modules, explicit ports/adapters, PostgreSQL as structured source of truth, a transactional outbox for durable events, and Fastify only at transport boundaries. Start with one deployable service and one narrow calendar-to-notification vertical slice; postpone feature-heavy domains and final UI.

**Tech Stack:** Node.js 24 LTS, TypeScript 6, npm 11, Fastify 5, PostgreSQL 18-compatible SQL, `pg`, Zod, Vitest, ESLint, Prettier. Redis-compatible cache is represented behind a port in Core v1 and is not required to prove the first slice.

**Spec:** `docs/superpowers/specs/2026-08-30-agnes-greenfield-core-design.md`

## Global Constraints

- Greenfield product; legacy AGNES TV screens, navigation, architecture, and implementation are not inherited.
- Modular core, not premature microservices and not a monolithic manager.
- Domain logic must not import Fastify, PostgreSQL clients, provider SDKs, or AI SDKs.
- External provider data must be normalized into canonical AGNES types before domain logic consumes it.
- PostgreSQL is the structured source of truth for AGNES-owned state and canonical imported records.
- Durable domain publication uses a transactional outbox.
- Writes and side effects must be idempotent where retries can occur.
- AI is a constrained reasoning/orchestration layer, not source of truth, authorization authority, or execution authority.
- Material side effects pass permission/policy checks and are verified before user-visible success.
- Basic calendar/tasks/routines/notifications behavior must remain operable if the AI provider is unavailable.
- UI/UX, 3D avatar work, Travel, Cooking, Sports, Finance, and broad Smart Home features are out of scope for Core v1.
- Every task follows TDD: failing test, verify failure, minimal implementation, verify pass, commit.

## File Structure

```text
package.json                     # scripts, runtime/dev dependencies, Node engine
package-lock.json                # npm lockfile
tsconfig.json                    # strict TypeScript build configuration
eslint.config.js                 # lint rules
.prettierrc.json                 # formatting rules
.env.example                     # local environment contract

src/
  app/
    build-app.ts                 # composition root
    server.ts                    # Fastify startup only
  kernel/
    ids.ts                       # branded IDs and UUID generation
    clock.ts                     # Clock port + system/fake implementations
    result.ts                    # typed Result helpers
    errors.ts                    # structured application/domain errors
  household/
    household.ts                 # Household entity
    person.ts                    # Person entity
    household-repository.ts      # persistence port
  calendar/
    calendar-event.ts            # canonical CalendarEvent
    calendar-repository.ts       # persistence port
    import-calendar-event.ts     # normalized import use case
  events/
    agnes-event.ts               # universal event envelope
    domain-event-bus.ts          # in-process event bus port + implementation
    outbox.ts                    # outbox types/port
  persistence/
    postgres.ts                  # pg pool and transaction helper
    migrations/001_core.sql      # initial schema
    postgres-household-repository.ts
    postgres-calendar-repository.ts
    postgres-outbox-repository.ts
  context/
    household-context.ts         # materialized operational model
    context-store.ts             # context store port
    in-memory-context-store.ts   # first materialized store implementation
    update-context-from-event.ts # event-driven projector
  situations/
    situation.ts                 # structured situation contract
    departure-risk-detector.ts   # first detector
  permissions/
    capability.ts                # CAN_VIEW/CAN_SUGGEST/CAN_ACT
    policy-engine.ts             # permission/autonomy evaluation
  decisions/
    decision-score.ts            # deterministic ranking
    decide-situation.ts          # suggestion/no-op decision use case
  notifications/
    notification.ts              # canonical notification
    notification-repository.ts   # persistence port
    notification-delivery.ts     # delivery port
    create-notification.ts       # application use case
    acknowledge-notification.ts  # acknowledgement use case
  audit/
    audit-record.ts              # canonical audit entry
    audit-repository.ts          # persistence port
  integrations/
    connector.ts                 # common connector contract
    connector-registry.ts        # registry + health/capabilities
    calendar/
      external-calendar-record.ts
      calendar-normalizer.ts
      fake-calendar-connector.ts # deterministic first connector for slice/tests
  intelligence/
    model-gateway.ts             # AI model port
    unavailable-model-gateway.ts # explicit fallback
  workers/
    outbox-worker.ts             # durable publication worker
  transport/
    health-routes.ts             # health/readiness endpoints
    notification-routes.ts       # acknowledge endpoint only

tests/
  unit/
  integration/
  e2e/
```

---

### Task 1: Project Foundation and Quality Gates

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.env.example`
- Create: `src/app/server.ts`
- Create: `src/transport/health-routes.ts`
- Test: `tests/unit/health-routes.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `buildHealthRouter()` and a strict TypeScript/npm test/build/lint baseline used by every later task.

- [ ] **Step 1: Write the failing health-route test**

```ts
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerHealthRoutes } from '../../src/transport/health-routes.js';

describe('health routes', () => {
  it('returns ok without requiring external services', async () => {
    const app = Fastify();
    await registerHealthRoutes(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/unit/health-routes.test.ts`

Expected: FAIL because project configuration and `registerHealthRoutes` do not exist.

- [ ] **Step 3: Create the minimal project configuration**

`package.json` must contain:

```json
{
  "name": "agnes-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "check": "npm run lint && npm run build && npm test"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "pg": "^8.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@types/node": "^24.0.0",
    "@types/pg": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^6.0.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json` must enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `NodeNext` module resolution, and output to `dist`.

- [ ] **Step 4: Implement the health route**

```ts
import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' as const }));
}
```

- [ ] **Step 5: Install dependencies and run all quality gates**

Run:

```bash
npm install
npm run check
npm run format:check
```

Expected: lint/build/tests/format all pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.js .prettierrc.json .env.example src tests
git commit -m "chore: bootstrap AGNES core TypeScript service"
```

---

### Task 2: Kernel IDs, Clock, Result, and Typed Errors

**Files:**
- Create: `src/kernel/ids.ts`
- Create: `src/kernel/clock.ts`
- Create: `src/kernel/result.ts`
- Create: `src/kernel/errors.ts`
- Test: `tests/unit/kernel.test.ts`

**Interfaces:**
- Consumes: Node `crypto.randomUUID()`.
- Produces: branded IDs, `Clock`, `SystemClock`, `FixedClock`, `Result<T,E>`, `AgnesError` hierarchy.

- [ ] **Step 1: Write failing kernel tests**

```ts
import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/kernel/clock.js';
import { newEventId } from '../../src/kernel/ids.js';

it('provides deterministic time in tests', () => {
  const clock = new FixedClock(new Date('2026-08-30T10:00:00Z'));
  expect(clock.now().toISOString()).toBe('2026-08-30T10:00:00.000Z');
});

it('creates non-empty event ids', () => {
  expect(newEventId()).toMatch(/[0-9a-f-]{36}/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/kernel.test.ts`

Expected: FAIL because kernel modules are missing.

- [ ] **Step 3: Implement minimal kernel primitives**

`Clock` signature:

```ts
export interface Clock { now(): Date }
export class SystemClock implements Clock { now(): Date { return new Date(); } }
export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}
  now(): Date { return new Date(this.value); }
}
```

`Result` signature:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/kernel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/kernel tests/unit/kernel.test.ts
git commit -m "feat: add AGNES kernel primitives"
```

---

### Task 3: Canonical Household and Person Domain

**Files:**
- Create: `src/household/household.ts`
- Create: `src/household/person.ts`
- Create: `src/household/household-repository.ts`
- Test: `tests/unit/household.test.ts`

**Interfaces:**
- Consumes: `HouseholdId`, `PersonId` from `src/kernel/ids.ts`.
- Produces: `Household`, `Person`, `HouseholdRepository`.

- [ ] **Step 1: Write failing domain invariant tests**

```ts
import { describe, expect, it } from 'vitest';
import { createHousehold } from '../../src/household/household.js';

it('rejects a household without timezone', () => {
  expect(() => createHousehold({ name: 'Home', timezone: '', locale: 'el-CY' })).toThrow('timezone');
});

it('creates an active household with normalized name', () => {
  const household = createHousehold({ name: '  AGNES Home  ', timezone: 'Asia/Nicosia', locale: 'el-CY' });
  expect(household.name).toBe('AGNES Home');
  expect(household.status).toBe('active');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/household.test.ts`

Expected: FAIL because household domain does not exist.

- [ ] **Step 3: Implement canonical entities and repository port**

Use immutable TypeScript types and factory functions. `HouseholdRepository` must expose:

```ts
export interface HouseholdRepository {
  saveHousehold(household: Household): Promise<void>;
  savePerson(person: Person): Promise<void>;
  getHousehold(id: HouseholdId): Promise<Household | null>;
  listPeople(householdId: HouseholdId): Promise<readonly Person[]>;
}
```

- [ ] **Step 4: Run focused tests and build**

Run: `npm run build && npm test -- tests/unit/household.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/household tests/unit/household.test.ts
git commit -m "feat: add canonical household domain"
```

---

### Task 4: Canonical Calendar Event and External Reference

**Files:**
- Create: `src/calendar/calendar-event.ts`
- Create: `src/calendar/calendar-repository.ts`
- Create: `src/integrations/calendar/external-calendar-record.ts`
- Create: `src/integrations/calendar/calendar-normalizer.ts`
- Test: `tests/unit/calendar-normalizer.test.ts`

**Interfaces:**
- Consumes: kernel IDs and `Clock`.
- Produces: `CalendarEvent`, `ExternalReference`, `normalizeCalendarRecord(record)`.

- [ ] **Step 1: Write failing normalization test**

```ts
import { expect, it } from 'vitest';
import { normalizeCalendarRecord } from '../../src/integrations/calendar/calendar-normalizer.js';

it('normalizes provider data into canonical calendar event data', () => {
  const result = normalizeCalendarRecord({
    provider: 'test-calendar',
    externalId: 'evt-1',
    title: 'Football',
    startsAt: '2026-09-01T18:30:00+03:00',
    endsAt: '2026-09-01T19:30:00+03:00',
    timezone: 'Asia/Nicosia',
    version: '7'
  });

  expect(result.title).toBe('Football');
  expect(result.externalReference.externalId).toBe('evt-1');
  expect(result.externalReference.authoritative).toBe(true);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/calendar-normalizer.test.ts`

Expected: FAIL because normalization layer is absent.

- [ ] **Step 3: Implement types and validation**

`CalendarEvent` must enforce `endsAt > startsAt`. `ExternalReference` must carry `provider`, `externalId`, optional `externalVersion`, optional `etag`, optional `syncToken`, `lastSyncedAt`, and `authoritative`.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/calendar-normalizer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/calendar src/integrations/calendar tests/unit/calendar-normalizer.test.ts
git commit -m "feat: add canonical calendar normalization"
```

---

### Task 5: Universal AgnesEvent and In-Process Domain Event Bus

**Files:**
- Create: `src/events/agnes-event.ts`
- Create: `src/events/domain-event-bus.ts`
- Test: `tests/unit/domain-event-bus.test.ts`

**Interfaces:**
- Consumes: `EventId`, `HouseholdId`, `Clock`.
- Produces: `AgnesEvent<TPayload>`, `DomainEventBus.publish()`, `DomainEventBus.subscribe()`.

- [ ] **Step 1: Write failing event-bus tests**

```ts
import { expect, it, vi } from 'vitest';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';

it('delivers an event to subscribers exactly once per publish call', async () => {
  const bus = new InMemoryDomainEventBus();
  const handler = vi.fn();
  bus.subscribe('calendar.event.created.v1', handler);

  await bus.publish({ type: 'calendar.event.created.v1' } as never);

  expect(handler).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/domain-event-bus.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement event envelope and bus**

Event envelope fields must match the approved spec exactly: `id`, `type`, `version`, `occurredAt`, `receivedAt`, `source`, `householdId`, optional actor/entity/correlation/causation fields, `payload`, and `metadata`.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/domain-event-bus.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/events tests/unit/domain-event-bus.test.ts
git commit -m "feat: add versioned AGNES domain events"
```

---

### Task 6: PostgreSQL Schema, Transaction Helper, and Transactional Outbox

**Files:**
- Create: `src/persistence/postgres.ts`
- Create: `src/persistence/migrations/001_core.sql`
- Create: `src/events/outbox.ts`
- Create: `src/persistence/postgres-outbox-repository.ts`
- Test: `tests/integration/postgres-outbox.test.ts`

**Interfaces:**
- Consumes: `AgnesEvent`.
- Produces: `withTransaction(fn)`, `OutboxRepository.append(tx,event)`, `OutboxRepository.claimBatch(limit)`, `OutboxRepository.markPublished(id)`.

- [ ] **Step 1: Write failing integration test**

```ts
it('commits domain state and outbox record atomically', async () => {
  await withTransaction(async (tx) => {
    await tx.query(`insert into households(id,name,timezone,locale,status) values($1,$2,$3,$4,$5)`, [
      householdId, 'Home', 'Asia/Nicosia', 'el-CY', 'active'
    ]);
    await outbox.append(tx, event);
  });

  const outboxRows = await pool.query('select event_type from outbox_events where event_id = $1', [event.id]);
  expect(outboxRows.rows).toHaveLength(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run with a local/CI PostgreSQL URL:

`DATABASE_URL=postgres://postgres:postgres@localhost:5432/agnes_test npm test -- tests/integration/postgres-outbox.test.ts`

Expected: FAIL because schema/repositories do not exist.

- [ ] **Step 3: Create migration**

`001_core.sql` must create at minimum:

- `households`
- `people`
- `calendar_events`
- `external_references`
- `outbox_events`
- unique constraint on `(provider, external_id)`
- unique constraint on `outbox_events.event_id`

The outbox table must include publication state and retry metadata.

- [ ] **Step 4: Implement transaction and outbox repositories**

Use one `pg.PoolClient` transaction for state mutation plus outbox insert. Never publish directly inside the DB transaction.

- [ ] **Step 5: Run migration and integration test**

Run:

```bash
psql "$DATABASE_URL" -f src/persistence/migrations/001_core.sql
npm test -- tests/integration/postgres-outbox.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/persistence src/events/outbox.ts tests/integration/postgres-outbox.test.ts
git commit -m "feat: add PostgreSQL transactional outbox"
```

---

### Task 7: PostgreSQL Household and Calendar Repositories

**Files:**
- Create: `src/persistence/postgres-household-repository.ts`
- Create: `src/persistence/postgres-calendar-repository.ts`
- Test: `tests/integration/postgres-repositories.test.ts`

**Interfaces:**
- Consumes: `HouseholdRepository`, `CalendarRepository`, `pg.Pool`.
- Produces: `PostgresHouseholdRepository`, `PostgresCalendarRepository.upsertByExternalReference()`.

- [ ] **Step 1: Write failing repository idempotency test**

```ts
it('updates an imported calendar event instead of duplicating it', async () => {
  await repository.upsertByExternalReference(firstVersion);
  await repository.upsertByExternalReference(secondVersion);

  const events = await repository.listUpcoming(householdId, new Date('2026-09-01T00:00:00Z'));
  expect(events).toHaveLength(1);
  expect(events[0]?.title).toBe('Football - updated');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/integration/postgres-repositories.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement repositories with parameterized SQL**

`CalendarRepository` contract:

```ts
export interface CalendarRepository {
  upsertByExternalReference(event: CalendarEvent): Promise<{ event: CalendarEvent; change: 'created' | 'updated' | 'unchanged' }>;
  listUpcoming(householdId: HouseholdId, from: Date): Promise<readonly CalendarEvent[]>;
  getById(id: CalendarEventId): Promise<CalendarEvent | null>;
}
```

- [ ] **Step 4: Run integration tests**

Run: `npm test -- tests/integration/postgres-repositories.test.ts`

Expected: PASS including duplicate-import protection.

- [ ] **Step 5: Commit**

```bash
git add src/persistence src/calendar/calendar-repository.ts tests/integration/postgres-repositories.test.ts
git commit -m "feat: persist canonical household and calendar state"
```

---

### Task 8: Connector Contract, Registry, Health, and Fake Calendar Connector

**Files:**
- Create: `src/integrations/connector.ts`
- Create: `src/integrations/connector-registry.ts`
- Create: `src/integrations/calendar/fake-calendar-connector.ts`
- Test: `tests/unit/connector-registry.test.ts`

**Interfaces:**
- Consumes: canonical integration types.
- Produces: `Connector`, `ConnectorCapabilities`, `ConnectorHealth`, `ConnectorRegistry`, deterministic fake calendar connector.

- [ ] **Step 1: Write failing registry test**

```ts
it('reports capabilities and health for a registered connector', async () => {
  const registry = new ConnectorRegistry();
  registry.register(fakeCalendarConnector);

  expect(registry.get('test-calendar')?.capabilities()).toMatchObject({ read: true, write: false });
  expect((await registry.health('test-calendar')).state).toBe('connected');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/connector-registry.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement connector contract**

The contract must expose conceptually:

```ts
interface Connector<TRecord, TAction = never> {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<ConnectorHealth>;
  capabilities(): ConnectorCapabilities;
  sync(cursor?: string): Promise<{ records: readonly TRecord[]; cursor?: string }>;
  execute?(action: TAction): Promise<unknown>;
}
```

Allowed health states: `connected`, `degraded`, `auth_expired`, `rate_limited`, `error`, `disconnected`.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/connector-registry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/integrations tests/unit/connector-registry.test.ts
git commit -m "feat: add connector framework and registry"
```

---

### Task 9: Calendar Import Use Case with Idempotent Event Emission

**Files:**
- Create: `src/calendar/import-calendar-event.ts`
- Test: `tests/integration/import-calendar-event.test.ts`

**Interfaces:**
- Consumes: `CalendarRepository`, `OutboxRepository`, `Clock`, `normalizeCalendarRecord()`.
- Produces: `importCalendarRecord(record, context)` emitting `calendar.event.created.v1` or `calendar.event.updated.v1` only for logical changes.

- [ ] **Step 1: Write failing retry/idempotency test**

```ts
it('does not emit a second logical event when the provider retries an unchanged record', async () => {
  await importer.import(record);
  await importer.import(record);

  const events = await readOutboxEvents('calendar.event.created.v1');
  expect(events).toHaveLength(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/integration/import-calendar-event.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement import transaction**

Inside one transaction:

1. normalize provider record;
2. upsert canonical calendar event;
3. if `change === 'unchanged'`, return without event;
4. construct versioned `AgnesEvent`;
5. append to outbox;
6. commit.

- [ ] **Step 4: Run integration test**

Run: `npm test -- tests/integration/import-calendar-event.test.ts`

Expected: PASS for create, update, and duplicate retry cases.

- [ ] **Step 5: Commit**

```bash
git add src/calendar/import-calendar-event.ts tests/integration/import-calendar-event.test.ts
git commit -m "feat: import calendar records idempotently"
```

---

### Task 10: Context Materialization from Domain Events

**Files:**
- Create: `src/context/household-context.ts`
- Create: `src/context/context-store.ts`
- Create: `src/context/in-memory-context-store.ts`
- Create: `src/context/update-context-from-event.ts`
- Test: `tests/unit/context-projector.test.ts`

**Interfaces:**
- Consumes: calendar events from domain bus/outbox publication.
- Produces: `HouseholdContext`, `ContextStore`, `updateContextFromEvent()`.

- [ ] **Step 1: Write failing projector test**

```ts
it('adds a created calendar event to upcoming context', async () => {
  await updateContextFromEvent(calendarCreatedEvent, store);
  const context = await store.get(householdId);

  expect(context.upcomingEvents.map((event) => event.id)).toContain(calendarEventId);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/context-projector.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement materialized context model**

Initial `HouseholdContext` fields must include timestamp, people present/away, active/upcoming events, active/urgent tasks, current weather optional, travel conditions optional, active routines, device states, open notifications, attention states, and detected situations. Fields outside the first slice may start as empty canonical collections, not omitted ad hoc.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/context-projector.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context tests/unit/context-projector.test.ts
git commit -m "feat: materialize household context from events"
```

---

### Task 11: Structured Situation and Departure-Risk Detector

**Files:**
- Create: `src/situations/situation.ts`
- Create: `src/situations/departure-risk-detector.ts`
- Test: `tests/unit/departure-risk-detector.test.ts`

**Interfaces:**
- Consumes: `HouseholdContext`, route/travel-time input, `Clock`.
- Produces: `Situation` with type, confidence, related entities, supporting factors, expiry.

- [ ] **Step 1: Write failing detector tests**

```ts
it('detects departure risk when remaining time is below travel time plus buffer', () => {
  const situations = detector.detect({
    now: new Date('2026-09-01T15:00:00Z'),
    eventStartsAt: new Date('2026-09-01T15:30:00Z'),
    travelMinutes: 25,
    bufferMinutes: 10
  });

  expect(situations[0]?.type).toBe('LATE_DEPARTURE_RISK');
  expect(situations[0]?.confidence).toBeGreaterThan(0.8);
});
```

Also test a no-risk case.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/departure-risk-detector.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic detector**

Do not use AI. Supporting factors must explicitly record event start, travel minutes, buffer minutes, and remaining minutes so later explainability can use real factors.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/departure-risk-detector.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/situations tests/unit/departure-risk-detector.test.ts
git commit -m "feat: detect late departure risk"
```

---

### Task 12: Permission, Autonomy, and Decision Scoring

**Files:**
- Create: `src/permissions/capability.ts`
- Create: `src/permissions/policy-engine.ts`
- Create: `src/decisions/decision-score.ts`
- Create: `src/decisions/decide-situation.ts`
- Test: `tests/unit/policy-and-decision.test.ts`

**Interfaces:**
- Consumes: `Situation`, per-person/actor policy, attention state.
- Produces: `PolicyDecision`, `DecisionOutcome = 'ignore' | 'suggest' | 'prepare' | 'act'`.

- [ ] **Step 1: Write failing policy tests**

```ts
it('allows suggestion while denying material action when CAN_ACT requires confirmation', () => {
  const policy = evaluateCapability({
    capability: 'calendar_changes',
    requested: 'act',
    grant: { view: true, suggest: true, act: 'requires_confirmation' }
  });

  expect(policy.allowed).toBe(false);
  expect(policy.requiresConfirmation).toBe(true);
});
```

Decision-score test must assert that a high urgency/relevance situation beats an equivalent low-confidence candidate and that sleeping attention suppresses non-urgent suggestions.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/policy-and-decision.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic policy and score functions**

Use explicit numeric inputs for relevance, urgency, impact, confidence, timing quality, interruption cost, and repetition penalty. Coefficients live in typed configuration, not prompts.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/policy-and-decision.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/permissions src/decisions tests/unit/policy-and-decision.test.ts
git commit -m "feat: gate and rank AGNES decisions"
```

---

### Task 13: Canonical Notifications, Delivery Port, Acknowledgement, and Audit

**Files:**
- Create: `src/notifications/notification.ts`
- Create: `src/notifications/notification-repository.ts`
- Create: `src/notifications/notification-delivery.ts`
- Create: `src/notifications/create-notification.ts`
- Create: `src/notifications/acknowledge-notification.ts`
- Create: `src/audit/audit-record.ts`
- Create: `src/audit/audit-repository.ts`
- Create: `src/transport/notification-routes.ts`
- Test: `tests/unit/notifications.test.ts`

**Interfaces:**
- Consumes: allowed `DecisionOutcome`, situation supporting factors.
- Produces: canonical `Notification`, `NotificationDelivery`, acknowledgement use case, `AuditRecord`.

- [ ] **Step 1: Write failing delivery-verification test**

```ts
it('does not mark notification delivered when provider delivery fails', async () => {
  delivery.send.mockRejectedValue(new Error('provider down'));

  const result = await service.createAndDeliver(candidate);

  expect(result.ok).toBe(false);
  expect(await repository.get(candidate.id)).toMatchObject({ state: 'failed' });
});
```

Acknowledgement test must prove state changes from `delivered` to `acknowledged` and writes one audit record.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/notifications.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement notification lifecycle**

Canonical states: `pending`, `delivering`, `delivered`, `failed`, `acknowledged`, `expired`, `suppressed`.

`NotificationDelivery.send()` returns a provider receipt on success. Only then may state become `delivered`.

- [ ] **Step 4: Add acknowledgement route**

`POST /notifications/:id/acknowledge` calls the application use case; transport code must not mutate repository state directly.

- [ ] **Step 5: Run tests/build**

Run: `npm run build && npm test -- tests/unit/notifications.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/notifications src/audit src/transport/notification-routes.ts tests/unit/notifications.test.ts
git commit -m "feat: add verified notifications and audit trail"
```

---

### Task 14: Durable Outbox Worker and Retry Semantics

**Files:**
- Create: `src/workers/outbox-worker.ts`
- Test: `tests/unit/outbox-worker.test.ts`

**Interfaces:**
- Consumes: `OutboxRepository`, `DomainEventBus`.
- Produces: `OutboxWorker.runOnce(limit)` with retry-safe publication.

- [ ] **Step 1: Write failing retry test**

```ts
it('leaves an event unpublished when the bus throws and republishes it on the next run', async () => {
  bus.publish.mockRejectedValueOnce(new Error('temporary'));

  await worker.runOnce(10);
  expect(await outbox.get(event.id)).toMatchObject({ publishedAt: null, attempts: 1 });

  bus.publish.mockResolvedValueOnce(undefined);
  await worker.runOnce(10);
  expect((await outbox.get(event.id))?.publishedAt).not.toBeNull();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/outbox-worker.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement claim/publish/mark flow**

The worker must claim a bounded batch, increment attempts on failure, use exponential retry timestamps, and never mark an event published before the bus accepts it.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/outbox-worker.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workers tests/unit/outbox-worker.test.ts
git commit -m "feat: publish durable outbox events safely"
```

---

### Task 15: Explicit AI Gateway and AI-Unavailable Fallback

**Files:**
- Create: `src/intelligence/model-gateway.ts`
- Create: `src/intelligence/unavailable-model-gateway.ts`
- Test: `tests/unit/model-fallback.test.ts`

**Interfaces:**
- Consumes: none from providers.
- Produces: provider-neutral `ModelGateway` and explicit unavailable implementation.

- [ ] **Step 1: Write failing fallback test**

```ts
it('returns a typed unavailable result instead of throwing through core workflows', async () => {
  const gateway = new UnavailableModelGateway();
  const result = await gateway.extractIntent('what do we have today?');

  expect(result).toEqual({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/model-fallback.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement provider-neutral model port**

The first port supports structured operations only: intent extraction, constrained planning, summarization, and response generation. No provider SDK belongs in this task.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/model-fallback.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/intelligence tests/unit/model-fallback.test.ts
git commit -m "feat: isolate AI behind model gateway"
```

---

### Task 16: Composition Root for the First Vertical Slice

**Files:**
- Create: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Test: `tests/unit/build-app.test.ts`

**Interfaces:**
- Consumes: all ports/adapters built above.
- Produces: `buildApp(config)` with explicit dependency wiring.

- [ ] **Step 1: Write failing composition test**

```ts
it('builds the core application with AI unavailable', async () => {
  const app = await buildApp({
    databaseUrl: process.env.DATABASE_URL!,
    modelGateway: new UnavailableModelGateway()
  });

  expect(app.modelGateway).toBeInstanceOf(UnavailableModelGateway);
  expect(app.connectorRegistry.get('test-calendar')).toBeDefined();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/build-app.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement composition root**

All concrete adapters are instantiated here. Domain/application modules receive interfaces via constructor/function arguments. `server.ts` only reads environment, calls `buildApp`, registers routes, and listens.

- [ ] **Step 4: Run tests/build**

Run: `npm run build && npm test -- tests/unit/build-app.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app tests/unit/build-app.test.ts
git commit -m "feat: compose AGNES core application"
```

---

### Task 17: End-to-End Calendar-to-Notification Vertical Slice

**Files:**
- Create: `tests/e2e/calendar-to-notification.test.ts`
- Modify: `src/app/build-app.ts`
- Modify: event/context/situation/decision/notification wiring files only as required by the test.

**Interfaces:**
- Consumes: fake calendar connector, canonical import, PostgreSQL, outbox worker, context projector, departure detector, decision engine, fake verified notification delivery, audit.
- Produces: first proven AGNES nervous-system slice.

- [ ] **Step 1: Write the failing E2E test**

The test must execute this exact sequence:

```ts
it('imports an event, detects departure risk, sends one suggestion, and records acknowledgement', async () => {
  // 1. seed household/person
  // 2. fake connector returns event at 18:30
  // 3. import connector delta
  // 4. run outbox worker
  // 5. assert context has upcoming event
  // 6. feed deterministic 25-minute route input at 18:00 with 10-minute buffer
  // 7. detect LATE_DEPARTURE_RISK
  // 8. decision policy allows suggestion
  // 9. verified fake delivery succeeds
  // 10. assert exactly one delivered notification
  // 11. acknowledge it
  // 12. assert audit chain shares correlation id
});
```

The same test file must include a duplicate provider retry case and a delivery-provider failure case.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/e2e/calendar-to-notification.test.ts`

Expected: FAIL until wiring is complete.

- [ ] **Step 3: Wire only the missing application flow**

Do not add Travel, weather APIs, UI, AI reasoning, or unrelated features. Reuse the route-time input as an injected deterministic port/value for this slice.

- [ ] **Step 4: Run focused E2E test**

Run: `npm test -- tests/e2e/calendar-to-notification.test.ts`

Expected: all create/retry/failure scenarios PASS.

- [ ] **Step 5: Run the complete quality suite**

Run:

```bash
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src tests/e2e/calendar-to-notification.test.ts
git commit -m "feat: prove AGNES calendar-to-notification vertical slice"
```

---

### Task 18: CI Verification and Core v1 Operational Documentation

**Files:**
- Create: `.github/workflows/core-ci.yml`
- Create: `docs/core-v1-operations.md`
- Modify: `README.md`
- Test: CI workflow run after push.

**Interfaces:**
- Consumes: complete Core v1 repository.
- Produces: repeatable CI and operator/developer instructions.

- [ ] **Step 1: Create CI workflow with PostgreSQL service**

The workflow must:

- run on pull requests and pushes to `main`;
- use Node 24;
- run `npm ci`;
- start PostgreSQL 18 service;
- apply `001_core.sql`;
- run `npm run lint`, `npm run build`, `npm test`, `npm run format:check`.

- [ ] **Step 2: Document exact local startup and verification commands**

`docs/core-v1-operations.md` must describe required environment variables, migration command, test commands, connector health meanings, outbox retry behavior, and how to run with `UnavailableModelGateway`.

- [ ] **Step 3: Update README**

README must point to the approved spec, this implementation plan, and Core v1 operations. It must state that final UI is intentionally deferred.

- [ ] **Step 4: Run local full verification**

Run:

```bash
npm ci
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/core-ci.yml docs/core-v1-operations.md README.md
git commit -m "ci: verify AGNES Core v1"
```

- [ ] **Step 6: Verify GitHub Actions result**

After push, inspect the workflow run for the final commit. Core v1 is not declared complete unless the workflow is green and the first vertical-slice E2E test passes.

---

## Spec Coverage Self-Review

- Product definition / greenfield constraint: Tasks 1 and 18.
- Modular boundaries and provider isolation: Tasks 1, 8, 15, 16.
- Hybrid/local-cloud architecture: Core v1 implements cloud/server contracts and offline-safe idempotency boundaries; device-local synchronization implementation remains intentionally outside the first vertical slice, as allowed by the spec's phased build order.
- Canonical household/person/calendar models: Tasks 3 and 4.
- Household graph foundation: relational identity/relationship fields in Tasks 3, 4, 6, 7; graph database intentionally not introduced.
- Universal/versioned events: Task 5.
- Transactional outbox/durability/idempotency: Tasks 6, 9, 14.
- Context materialization: Task 10.
- Situation detection: Task 11.
- Permission/autonomy/decision/attention suppression: Task 12.
- Notifications/verification/acknowledgement/audit: Task 13.
- Connector framework/health: Task 8.
- Normalization/sync source-of-truth behavior: Tasks 4, 7, 9.
- AI model isolation/fallback: Task 15.
- First end-to-end slice: Task 17.
- Testing/failure injection: Tasks 6, 7, 9, 13, 14, 17.
- CI/operations: Task 18.
- Final visual design remains out of scope until Core v1 acceptance passes.

## Type Consistency Check

The plan consistently uses:

- `HouseholdRepository.saveHousehold/savePerson/getHousehold/listPeople`
- `CalendarRepository.upsertByExternalReference/listUpcoming/getById`
- `DomainEventBus.publish/subscribe`
- `OutboxRepository.append/claimBatch/markPublished`
- `ContextStore.get/set`
- `Connector.sync/health/capabilities`
- `NotificationDelivery.send`
- `ModelGateway` with typed structured results

No task relies on an interface name introduced only implicitly in a later task.

## Execution Order

Execute Tasks 1 through 18 sequentially. Do not parallelize tasks that touch the same persistence/event contracts. Each task must end with its focused tests passing before the next task starts. The full suite must be run at Tasks 17 and 18.
