# KidsWorld v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real, persisted, responsive KidsWorld vertical slice inside AGNES, covering child profiles, My Day, learning, routines, rewards, curated content surfaces, parent summary, and end-to-end verification.

**Architecture:** Extend the existing TypeScript/Fastify/PostgreSQL Core with an isolated `src/kidsworld/` domain and application boundary, a PostgreSQL repository using the existing transactional outbox, and typed `/api/kidsworld` routes. Add a separate React + TypeScript + Vite client under `web/`, driven by typed API contracts and real persisted state rather than screenshots. Keep identity canonical in `Person`; KidsWorld progression is keyed by `PersonId` and `HouseholdId`.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, PostgreSQL 18, Zod 4, Vitest 3, React, React DOM, React Router, Vite, Testing Library, CSS Modules/plain CSS, `@js-temporal/polyfill` for exact local-date boundaries.

**Spec:** `docs/superpowers/specs/2026-08-31-kidsworld-v1-design.md`

## Global Constraints

- Keep the existing backend in `src/`; do not move Core into a workspace or rewrite the greenfield architecture.
- Add the web client under `web/`; the root package remains the control plane and invokes web scripts with `npm --prefix web`.
- Identity stays in `Person`; no duplicate child identity table or hard-coded routing by child name.
- Persist progression, mission completion, stars, learning, routines, reward requests, and parent-summary inputs in PostgreSQL.
- Use the existing transactional outbox pattern for KidsWorld events.
- Mission completion and star awards must be idempotent under retries and concurrency.
- Child authorization is enforced server-side; URL changes alone never grant parent or cross-household access.
- Free-form model generation and unrestricted child chat are out of scope for v1; Stories/Create use curated typed catalog content.
- Greek is the primary child-facing UI language; English appears where it is the learning content or an established product label.
- Support monitor/TV, tablet, and mobile from one component system; touch targets are at least 44 CSS pixels and motion respects `prefers-reduced-motion`.
- Existing Core tests and CI remain green.

---

## File Structure Map

### Backend files to create

- `src/kidsworld/kidsworld-profile.ts` — KidsWorld profile state keyed by canonical person identity.
- `src/kidsworld/mission.ts` — mission lifecycle and completion rules.
- `src/kidsworld/star-ledger.ts` — immutable star ledger entry creation and balance rules.
- `src/kidsworld/learning.ts` — learning session and aggregate progress types/rules.
- `src/kidsworld/routine.ts` — daily routine step types/rules.
- `src/kidsworld/reward.ts` — reward catalog/request lifecycle and affordability rules.
- `src/kidsworld/kidsworld-repository.ts` — read repository and transactional write-unit interfaces.
- `src/kidsworld/kidsworld-events.ts` — versioned KidsWorld event factories.
- `src/kidsworld/complete-mission.ts` — idempotent mission completion transaction.
- `src/kidsworld/record-learning-session.ts` — learning transaction.
- `src/kidsworld/complete-routine-step.ts` — routine transaction.
- `src/kidsworld/request-reward.ts` — reward request transaction.
- `src/kidsworld/approve-reward.ts` — parent approval transaction.
- `src/kidsworld/get-dashboard.ts` — child dashboard composition including My Day.
- `src/kidsworld/get-parent-summary.ts` — parent summary composition.
- `src/kidsworld/content/catalog.ts` — curated School/Explorer/Stories/Games/Create/Bedtime catalog.
- `src/kidsworld/content/get-content.ts` — typed content lookup and feature availability.
- `src/kidsworld/kidsworld-capabilities.ts` — KidsWorld capability names and grant presets.
- `src/transport/request-context.ts` — request context resolver abstraction and trusted-local resolver.
- `src/transport/kidsworld-routes.ts` — Zod-validated Fastify KidsWorld routes.
- `src/persistence/migrations/002_kidsworld.sql` — KidsWorld relational schema.
- `src/persistence/postgres-kidsworld-repository.ts` — PostgreSQL implementation and transaction wrapper.

### Existing backend files to modify

- `src/kernel/ids.ts` — branded KidsWorld IDs and constructors.
- `src/calendar/calendar-repository.ts` — bounded range query needed by My Day.
- `src/persistence/postgres-calendar-repository.ts` — implement bounded range query.
- `src/app/build-app.ts` — compose KidsWorld repository/services.
- `src/app/server.ts` — register KidsWorld routes and request context resolver.
- `package.json` / `package-lock.json` — backend date dependency and root web control scripts.
- `.github/workflows/core-ci.yml` — install/build/test web and apply KidsWorld migration.

### Web files to create

- `web/package.json`
- `web/package-lock.json`
- `web/tsconfig.json`
- `web/vite.config.ts`
- `web/index.html`
- `web/src/main.tsx`
- `web/src/app/App.tsx`
- `web/src/app/router.tsx`
- `web/src/api/contracts.ts`
- `web/src/api/kidsworld-api.ts`
- `web/src/styles/tokens.css`
- `web/src/styles/global.css`
- `web/src/components/KidsWorldShell.tsx`
- `web/src/components/ChildProfileCard.tsx`
- `web/src/components/StarMeter.tsx`
- `web/src/components/CompanionPrompt.tsx`
- `web/src/components/FeatureCard.tsx`
- `web/src/components/AsyncState.tsx`
- `web/src/pages/ProfileChooserPage.tsx`
- `web/src/pages/KidsHomePage.tsx`
- `web/src/pages/MyDayPage.tsx`
- `web/src/pages/SchoolWorldPage.tsx`
- `web/src/pages/ExplorerWorldPage.tsx`
- `web/src/pages/StoriesPage.tsx`
- `web/src/pages/GamesPage.tsx`
- `web/src/pages/CreateStudioPage.tsx`
- `web/src/pages/RewardsPage.tsx`
- `web/src/pages/BedtimePage.tsx`
- `web/src/pages/ParentSummaryPage.tsx`

### Tests to create

- `tests/unit/kidsworld-domain.test.ts`
- `tests/unit/kidsworld-mission.test.ts`
- `tests/unit/kidsworld-learning-routine-reward.test.ts`
- `tests/unit/kidsworld-dashboard.test.ts`
- `tests/unit/kidsworld-permissions.test.ts`
- `tests/integration/postgres-kidsworld-repository.test.ts`
- `tests/integration/kidsworld-mission-transaction.test.ts`
- `tests/integration/kidsworld-progression-transactions.test.ts`
- `tests/transport/kidsworld-routes.test.ts`
- `tests/e2e/kidsworld-vertical-slice.test.ts`
- `web/src/app/App.test.tsx`
- `web/src/pages/ProfileChooserPage.test.tsx`
- `web/src/pages/MyDayPage.test.tsx`
- `web/src/pages/RewardsPage.test.tsx`
- `web/src/pages/ParentSummaryPage.test.tsx`

---

### Task 1: KidsWorld IDs and Pure Domain Primitives

**Files:**
- Modify: `src/kernel/ids.ts`
- Create: `src/kidsworld/kidsworld-profile.ts`
- Create: `src/kidsworld/mission.ts`
- Create: `src/kidsworld/star-ledger.ts`
- Create: `src/kidsworld/learning.ts`
- Create: `src/kidsworld/routine.ts`
- Create: `src/kidsworld/reward.ts`
- Test: `tests/unit/kidsworld-domain.test.ts`

**Interfaces:**
- Consumes: existing `HouseholdId`, `PersonId`, `ValidationError`.
- Produces: `KidsWorldMissionId`, `StarLedgerEntryId`, `LearningSessionId`, `RewardId`, `RewardRequestId`, domain records and constructors used by all later tasks.

- [ ] **Step 1: Write failing domain tests**

```ts
import { describe, expect, it } from 'vitest';
import { createKidsWorldProfile } from '../../src/kidsworld/kidsworld-profile.js';
import { createMission, completeMissionRecord } from '../../src/kidsworld/mission.js';
import { createStarLedgerEntry } from '../../src/kidsworld/star-ledger.js';

const householdId = '00000000-0000-4000-8000-000000000001' as never;
const personId = '00000000-0000-4000-8000-000000000002' as never;

describe('KidsWorld domain', () => {
  it('creates a profile with zero progression', () => {
    const profile = createKidsWorldProfile({ householdId, personId, avatarKey: 'vasilis-blue' });
    expect(profile).toMatchObject({ householdId, personId, xp: 0, starsBalance: 0, status: 'active' });
  });

  it('completes an available mission once', () => {
    const mission = createMission({
      householdId,
      personId,
      type: 'learning',
      title: '5 λεπτά ανάγνωση',
      scheduledFor: new Date('2026-09-01T15:00:00Z'),
      rewardStars: 10,
      source: 'system',
    });
    const completed = completeMissionRecord(mission, new Date('2026-09-01T15:05:00Z'));
    expect(completed.status).toBe('completed');
    expect(() => completeMissionRecord(completed, new Date())).toThrow(/already completed/i);
  });

  it('rejects a zero-value star ledger entry', () => {
    expect(() => createStarLedgerEntry({ householdId, personId, amount: 0, reason: 'test', correlationId: 'x' }))
      .toThrow(/amount/i);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/kidsworld-domain.test.ts`

Expected: FAIL because `src/kidsworld/*` modules and KidsWorld ID constructors do not exist.

- [ ] **Step 3: Add branded IDs and minimal constructors**

Add to `src/kernel/ids.ts`:

```ts
export type KidsWorldMissionId = Brand<string, 'KidsWorldMissionId'>;
export type StarLedgerEntryId = Brand<string, 'StarLedgerEntryId'>;
export type LearningSessionId = Brand<string, 'LearningSessionId'>;
export type RewardId = Brand<string, 'RewardId'>;
export type RewardRequestId = Brand<string, 'RewardRequestId'>;

export const newKidsWorldMissionId = (): KidsWorldMissionId => randomUUID() as KidsWorldMissionId;
export const newStarLedgerEntryId = (): StarLedgerEntryId => randomUUID() as StarLedgerEntryId;
export const newLearningSessionId = (): LearningSessionId => randomUUID() as LearningSessionId;
export const newRewardId = (): RewardId => randomUUID() as RewardId;
export const newRewardRequestId = (): RewardRequestId => randomUUID() as RewardRequestId;
```

Implement the pure domain files with these exact discriminated unions:

```ts
export type MissionType = 'routine' | 'learning' | 'activity' | 'exploration' | 'story' | 'creative';
export type MissionStatus = 'available' | 'completed' | 'expired' | 'cancelled';
export type MissionSource = 'system' | 'calendar' | 'parent' | 'content';
export type LearningSubject = 'maths' | 'greek' | 'english' | 'science' | 'geography';
export type RoutineType = 'morning' | 'after-school' | 'bedtime';
export type RewardRequestStatus = 'pending' | 'approved' | 'rejected';
```

Keep constructor validation deterministic: non-empty titles/keys, positive mission rewards, non-zero ledger amounts, non-negative XP/balance, and immutable copied dates.

- [ ] **Step 4: Run domain tests and Core unit tests**

Run: `npm test -- tests/unit/kidsworld-domain.test.ts tests/unit/kernel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/kernel/ids.ts src/kidsworld tests/unit/kidsworld-domain.test.ts
git commit -m "feat: add KidsWorld domain primitives"
```

---

### Task 2: KidsWorld Relational Schema and Repository Contract

**Files:**
- Create: `src/persistence/migrations/002_kidsworld.sql`
- Create: `src/kidsworld/kidsworld-repository.ts`
- Create: `src/persistence/postgres-kidsworld-repository.ts`
- Test: `tests/integration/postgres-kidsworld-repository.test.ts`

**Interfaces:**
- Consumes: Task 1 domain records and IDs; existing `Pool`, `PoolClient`, `OutboxRepository`.
- Produces: `KidsWorldRepository`, `KidsWorldTransaction`, `PostgresKidsWorldRepository`.

- [ ] **Step 1: Write failing repository integration test**

```ts
it('round-trips profile, mission and reward catalog rows', async () => {
  const repository = new PostgresKidsWorldRepository(pool, outboxRepository);
  await repository.saveProfile(profile);
  await repository.saveMission(mission);
  await repository.saveReward(reward);

  expect(await repository.getProfile(profile.personId)).toMatchObject({ avatarKey: profile.avatarKey });
  expect(await repository.getMission(mission.id)).toMatchObject({ title: mission.title, status: 'available' });
  expect(await repository.listRewards(profile.householdId)).toHaveLength(1);
});
```

Create household/person fixtures first with `PostgresHouseholdRepository`; never bypass foreign keys.

- [ ] **Step 2: Run test before migration and verify RED**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
npm test -- tests/integration/postgres-kidsworld-repository.test.ts
```

Expected: FAIL because `PostgresKidsWorldRepository`/KidsWorld tables do not exist.

- [ ] **Step 3: Add migration with integrity constraints**

`002_kidsworld.sql` must create these tables and constraints:

```sql
create table if not exists kidsworld_profiles (
  person_id uuid primary key references people(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  avatar_key text not null,
  companion_key text not null,
  theme_key text not null,
  xp integer not null default 0 check (xp >= 0),
  stars_balance integer not null default 0 check (stars_balance >= 0),
  status text not null check (status in ('active','inactive')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (household_id, person_id)
);

create table if not exists kidsworld_missions (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  scheduled_for timestamptz not null,
  reward_stars integer not null check (reward_stars > 0),
  status text not null,
  source text not null,
  source_reference text,
  completed_at timestamptz
);

create table if not exists kidsworld_star_ledger (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  correlation_id text not null,
  created_at timestamptz not null,
  unique (person_id, correlation_id)
);
```

Also create `kidsworld_learning_progress`, `kidsworld_learning_sessions`, `kidsworld_routine_progress`, `kidsworld_rewards`, and `kidsworld_reward_requests` with the unique constraints from the spec, including unique `(person_id, local_date, routine, step_key)` and unique learning session IDs.

- [ ] **Step 4: Implement repository interfaces and round-trip mappings**

Use a transaction abstraction that does not leak `PoolClient` into application services:

```ts
export interface KidsWorldTransaction {
  getMissionForUpdate(id: KidsWorldMissionId): Promise<Mission | null>;
  markMissionCompleted(id: KidsWorldMissionId, completedAt: Date): Promise<boolean>;
  appendStarEntry(entry: StarLedgerEntry): Promise<boolean>;
  updateProfileProgress(personId: PersonId, xpDelta: number, starDelta: number): Promise<KidsWorldProfile>;
  appendEvent(event: AgnesEvent): Promise<void>;
  saveLearningSession(session: LearningSession): Promise<boolean>;
  upsertLearningProgress(progress: LearningProgress): Promise<void>;
  completeRoutineStep(step: RoutineStepCompletion): Promise<boolean>;
  saveRewardRequest(request: RewardRequest): Promise<void>;
  getRewardForUpdate(id: RewardId): Promise<Reward | null>;
  getRewardRequestForUpdate(id: RewardRequestId): Promise<RewardRequest | null>;
  updateRewardRequest(request: RewardRequest): Promise<void>;
}

export interface KidsWorldRepository {
  transaction<T>(work: (tx: KidsWorldTransaction) => Promise<T>): Promise<T>;
  saveProfile(profile: KidsWorldProfile): Promise<void>;
  saveMission(mission: Mission): Promise<void>;
  saveReward(reward: Reward): Promise<void>;
  getProfile(personId: PersonId): Promise<KidsWorldProfile | null>;
  listProfiles(householdId: HouseholdId): Promise<readonly KidsWorldProfile[]>;
  getMission(id: KidsWorldMissionId): Promise<Mission | null>;
  listMissions(personId: PersonId, from: Date, to: Date): Promise<readonly Mission[]>;
  listLearningProgress(personId: PersonId): Promise<readonly LearningProgress[]>;
  listRoutineProgress(personId: PersonId, localDate: string): Promise<readonly RoutineStepCompletion[]>;
  listRewards(householdId: HouseholdId): Promise<readonly Reward[]>;
  listRewardRequests(householdId: HouseholdId): Promise<readonly RewardRequest[]>;
}
```

`PostgresKidsWorldRepository.transaction()` obtains a client, begins, creates a transaction-scoped adapter, commits on success, rolls back on error, and always releases the client. `appendEvent` delegates to the existing `OutboxRepository.append(tx, event)`.

- [ ] **Step 5: Apply both migrations and verify integration test**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_kidsworld.sql
npm test -- tests/integration/postgres-kidsworld-repository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/persistence/migrations/002_kidsworld.sql src/kidsworld/kidsworld-repository.ts src/persistence/postgres-kidsworld-repository.ts tests/integration/postgres-kidsworld-repository.test.ts
git commit -m "feat: persist KidsWorld state"
```

---

### Task 3: Idempotent Mission Completion and Transactional Events

**Files:**
- Create: `src/kidsworld/kidsworld-events.ts`
- Create: `src/kidsworld/complete-mission.ts`
- Test: `tests/unit/kidsworld-mission.test.ts`
- Test: `tests/integration/kidsworld-mission-transaction.test.ts`

**Interfaces:**
- Consumes: `KidsWorldRepository.transaction`, Task 1 mission/star types, existing `createAgnesEvent`, `Clock`.
- Produces: `completeMission(input, deps): Promise<MissionCompletionResult>` and versioned mission/star events.

- [ ] **Step 1: Write a failing unit test for duplicate-safe service behavior**

```ts
it('returns the existing completion without awarding twice', async () => {
  const first = await completeMission({ householdId, personId, missionId }, deps);
  const second = await completeMission({ householdId, personId, missionId }, deps);

  expect(first.awardedStars).toBe(10);
  expect(second.awardedStars).toBe(0);
  expect(second.alreadyCompleted).toBe(true);
  expect(memoryTx.starEntries).toHaveLength(1);
});
```

- [ ] **Step 2: Run unit test and verify RED**

Run: `npm test -- tests/unit/kidsworld-mission.test.ts`

Expected: FAIL because service/event factories do not exist.

- [ ] **Step 3: Implement mission and star event factories**

```ts
export function createMissionCompletedEvent(
  mission: Mission,
  clock: Clock,
): AgnesEvent<{ missionId: string; personId: string; rewardStars: number }> {
  return createAgnesEvent({
    type: 'kidsworld.mission.completed.v1',
    version: 1,
    source: 'kidsworld',
    householdId: mission.householdId,
    actorId: mission.personId,
    entityType: 'kidsworld_mission',
    entityId: mission.id,
    correlationId: `kidsworld:mission:${mission.id}`,
    payload: { missionId: mission.id, personId: mission.personId, rewardStars: mission.rewardStars },
  }, clock);
}
```

Create `kidsworld.stars.awarded.v1` with the same correlation lineage and the ledger entry ID in the payload.

- [ ] **Step 4: Implement `completeMission` as one repository transaction**

Use this exact result contract:

```ts
export interface MissionCompletionResult {
  readonly mission: Mission;
  readonly profile: KidsWorldProfile;
  readonly awardedStars: number;
  readonly alreadyCompleted: boolean;
}
```

Inside one `repository.transaction`: lock mission, verify household/person ownership, return current state if already completed, atomically mark completion, insert ledger entry with `correlationId = mission:${mission.id}`, update profile by `rewardStars` and XP delta `rewardStars`, append both versioned events, return result.

- [ ] **Step 5: Write and run concurrent integration test**

```ts
it('cannot double-award when the same mission is completed concurrently', async () => {
  const [a, b] = await Promise.all([
    completeMission(input, deps),
    completeMission(input, deps),
  ]);
  expect(a.awardedStars + b.awardedStars).toBe(mission.rewardStars);
  const rows = await pool.query('select * from kidsworld_star_ledger where person_id = $1', [personId]);
  expect(rows.rowCount).toBe(1);
});
```

Run: `npm test -- tests/unit/kidsworld-mission.test.ts tests/integration/kidsworld-mission-transaction.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/kidsworld/kidsworld-events.ts src/kidsworld/complete-mission.ts tests/unit/kidsworld-mission.test.ts tests/integration/kidsworld-mission-transaction.test.ts
git commit -m "feat: complete KidsWorld missions transactionally"
```

---

### Task 4: Learning, Routine, and Reward Transactions

**Files:**
- Create: `src/kidsworld/record-learning-session.ts`
- Create: `src/kidsworld/complete-routine-step.ts`
- Create: `src/kidsworld/request-reward.ts`
- Create: `src/kidsworld/approve-reward.ts`
- Modify: `src/kidsworld/kidsworld-events.ts`
- Test: `tests/unit/kidsworld-learning-routine-reward.test.ts`
- Test: `tests/integration/kidsworld-progression-transactions.test.ts`

**Interfaces:**
- Consumes: Task 2 transaction methods and Task 1 domain types.
- Produces: `recordLearningSession`, `completeRoutineStep`, `requestReward`, `approveReward`.

- [ ] **Step 1: Write failing unit tests for each invariant**

```ts
it('aggregates learning minutes exactly once per session id', async () => {
  await recordLearningSession(input, deps);
  await recordLearningSession(input, deps);
  expect(memoryTx.sessions).toHaveLength(1);
  expect(memoryTx.progress.totalMinutes).toBe(10);
});

it('does not complete the same routine step twice for one local date', async () => {
  const first = await completeRoutineStep(stepInput, deps);
  const second = await completeRoutineStep(stepInput, deps);
  expect(first.created).toBe(true);
  expect(second.created).toBe(false);
});

it('rejects an approved reward when the child cannot afford it', async () => {
  await expect(approveReward({ householdId, actorPersonId: parentId, requestId }, deps))
    .rejects.toThrow(/insufficient stars/i);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/unit/kidsworld-learning-routine-reward.test.ts`

Expected: FAIL because application services do not exist.

- [ ] **Step 3: Implement services with exact event names**

Emit:

```ts
'kidsworld.learning.session.completed.v1'
'kidsworld.routine.step.completed.v1'
'kidsworld.reward.requested.v1'
'kidsworld.reward.approved.v1'
```

`recordLearningSession` inserts by `LearningSessionId`; if the insert returns false, return the persisted aggregate without incrementing again. `completeRoutineStep` relies on the unique local-date constraint. `requestReward` creates `pending` if approval is required and `approved` only for a no-approval reward that is immediately affordable. `approveReward` locks request + reward + profile, validates household and parent authorization at the service boundary, inserts a negative star ledger entry correlated to `reward:${requestId}`, updates balance, marks request approved, and writes its event in the same transaction.

- [ ] **Step 4: Write PostgreSQL transaction tests**

Test one successful and one rollback scenario for each mutation. The rollback assertion must verify both state and outbox remain unchanged after an induced error.

Run: `npm test -- tests/integration/kidsworld-progression-transactions.test.ts`

Expected: PASS.

- [ ] **Step 5: Run all KidsWorld backend tests so far**

Run: `npm test -- tests/unit/kidsworld-*.test.ts tests/integration/*kidsworld*.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/kidsworld tests/unit/kidsworld-learning-routine-reward.test.ts tests/integration/kidsworld-progression-transactions.test.ts
git commit -m "feat: add KidsWorld progression transactions"
```

---

### Task 5: My Day Composition, Exact Local-Date Boundaries, and Parent Summary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/calendar/calendar-repository.ts`
- Modify: `src/persistence/postgres-calendar-repository.ts`
- Create: `src/kidsworld/get-dashboard.ts`
- Create: `src/kidsworld/get-parent-summary.ts`
- Test: `tests/unit/kidsworld-dashboard.test.ts`

**Interfaces:**
- Consumes: calendar repository, KidsWorld repository, canonical person timezone.
- Produces: `getKidsWorldDashboard`, `getParentSummary`, `CalendarRepository.listRange`.

- [ ] **Step 1: Add `@js-temporal/polyfill`**

Run:

```bash
npm install @js-temporal/polyfill
```

Expected: root `package.json` and lockfile updated.

- [ ] **Step 2: Write a failing DST-safe dashboard test**

```ts
it('uses the child timezone to build one local day and sorts calendar plus missions', async () => {
  const dashboard = await getKidsWorldDashboard({
    householdId,
    personId,
    localDate: '2026-10-25',
  }, deps);

  expect(dashboard.timeline.map((item) => item.title)).toEqual([
    'Σχολείο',
    'Αγγλικά',
    'Πάρε μπουκάλι νερό',
  ]);
  expect(dashboard.localDate).toBe('2026-10-25');
});
```

- [ ] **Step 3: Extend calendar repository with a bounded query**

```ts
listRange(householdId: HouseholdId, from: Date, to: Date): Promise<readonly CalendarEvent[]>;
```

PostgreSQL query conditions:

```sql
where household_id = $1
  and status <> 'cancelled'
  and starts_at < $3
  and ends_at > $2
order by starts_at, id
```

- [ ] **Step 4: Implement local day bounds with Temporal**

```ts
function localDayBounds(localDate: string, timeZone: string): { from: Date; to: Date } {
  const start = Temporal.PlainDate.from(localDate).toZonedDateTime({ timeZone, plainTime: '00:00' });
  const end = start.add({ days: 1 });
  return { from: new Date(start.epochMilliseconds), to: new Date(end.epochMilliseconds) };
}
```

Build one dashboard DTO containing profile, timeline, missions, learning progress, routine progress, rewards summary, and feature availability. Filter calendar events to those owned by the child or whose `participants` contains the child.

- [ ] **Step 5: Implement parent summary aggregation**

Return one row per KidsWorld profile with exact fields:

```ts
export interface ParentChildSummary {
  personId: PersonId;
  displayName: string;
  completedMissions: number;
  remainingMissions: number;
  learningMinutes: number;
  starsEarned: number;
  starsSpent: number;
  pendingRewardRequests: number;
  tomorrowPreparation: readonly string[];
}
```

Tomorrow preparation derives from next-day missions with type `routine` plus next-day child calendar entries whose source/reference implies required preparation; if none exists, return an empty array, never fabricated advice.

- [ ] **Step 6: Run unit and calendar integration regression tests**

Run: `npm test -- tests/unit/kidsworld-dashboard.test.ts tests/integration/postgres-repositories.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/calendar src/persistence/postgres-calendar-repository.ts src/kidsworld/get-dashboard.ts src/kidsworld/get-parent-summary.ts tests/unit/kidsworld-dashboard.test.ts
git commit -m "feat: compose KidsWorld daily context"
```

---

### Task 6: Curated Content Catalog for All KidsWorld Feature Surfaces

**Files:**
- Create: `src/kidsworld/content/catalog.ts`
- Create: `src/kidsworld/content/get-content.ts`
- Test: `tests/unit/kidsworld-content.test.ts`

**Interfaces:**
- Consumes: no external provider.
- Produces: stable typed catalog IDs for `school`, `explore`, `stories`, `games`, `create`, and `bedtime`.

- [ ] **Step 1: Write failing content contract test**

```ts
it('exposes every v1 feature with stable IDs and no external URLs', () => {
  const features = ['school', 'explore', 'stories', 'games', 'create', 'bedtime'] as const;
  for (const feature of features) {
    const items = getKidsWorldContent(feature);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.id.length > 0)).toBe(true);
    expect(JSON.stringify(items)).not.toMatch(/https?:\/\//);
  }
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/unit/kidsworld-content.test.ts`

Expected: FAIL because catalog modules do not exist.

- [ ] **Step 3: Implement typed catalog items**

Use one shared shape:

```ts
export interface KidsWorldContentItem {
  readonly id: string;
  readonly feature: 'school' | 'explore' | 'stories' | 'games' | 'create' | 'bedtime';
  readonly title: string;
  readonly subtitle: string;
  readonly skillTags: readonly string[];
  readonly difficulty: 1 | 2 | 3;
  readonly rewardStars: number;
  readonly iconKey: string;
  readonly payload: Readonly<Record<string, string | number | readonly string[]>>;
}
```

Seed exact first items: Maths Lab, Greek Story Island, English City, Science Lab, Geography; London/Athens/Paris/Space missions; `hercules-first-labor`; three short arcade games; four Create modes; bedtime story/sounds/yoga/day-reflection. These are code catalog entries, not database progression records.

- [ ] **Step 4: Run content tests**

Run: `npm test -- tests/unit/kidsworld-content.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/kidsworld/content tests/unit/kidsworld-content.test.ts
git commit -m "feat: add curated KidsWorld content catalog"
```

---

### Task 7: Server-Side Request Context and KidsWorld Capabilities

**Files:**
- Create: `src/kidsworld/kidsworld-capabilities.ts`
- Create: `src/transport/request-context.ts`
- Test: `tests/unit/kidsworld-permissions.test.ts`

**Interfaces:**
- Consumes: existing `evaluateCapability`, `CapabilityGrant`, `PostgresHouseholdRepository` person data.
- Produces: `KidsWorldCapability`, `RequestContext`, `RequestContextResolver`, `authorizeKidsWorld`.

- [ ] **Step 1: Write failing permission tests**

```ts
it('allows a child to complete only their own mission', () => {
  expect(authorizeKidsWorld(childContext, 'kidsworld.complete_mission_self', childId)).toMatchObject({ allowed: true });
  expect(authorizeKidsWorld(childContext, 'kidsworld.complete_mission_self', siblingId)).toMatchObject({ allowed: false });
});

it('allows parent summary only with household read capability', () => {
  expect(authorizeKidsWorld(parentContext, 'kidsworld.read_household')).toMatchObject({ allowed: true });
  expect(authorizeKidsWorld(childContext, 'kidsworld.read_household')).toMatchObject({ allowed: false });
});
```

- [ ] **Step 2: Run permission tests and verify RED**

Run: `npm test -- tests/unit/kidsworld-permissions.test.ts`

Expected: FAIL because capability/context modules do not exist.

- [ ] **Step 3: Define capability names and grant presets**

```ts
export type KidsWorldCapability =
  | 'kidsworld.read_self'
  | 'kidsworld.complete_mission_self'
  | 'kidsworld.record_learning_self'
  | 'kidsworld.complete_routine_self'
  | 'kidsworld.request_reward_self'
  | 'kidsworld.read_household'
  | 'kidsworld.manage_rewards'
  | 'kidsworld.approve_rewards';
```

Map `permissionsProfileId = 'kids-child-v1'` and `'kids-parent-v1'` to immutable `CapabilityGrant` records. Unknown profiles get deny-all grants.

- [ ] **Step 4: Implement request context abstraction**

```ts
export interface RequestContext {
  readonly householdId: HouseholdId;
  readonly actorPersonId: PersonId;
  readonly grants: Readonly<Record<KidsWorldCapability, CapabilityGrant>>;
}

export interface RequestContextResolver {
  resolve(request: FastifyRequest): Promise<RequestContext>;
}
```

`TrustedHeaderRequestContextResolver` reads `x-agnes-household-id` and `x-agnes-actor-person-id`, loads the actor from the household repository, verifies actor membership/status, derives grants from `permissionsProfileId`, and rejects mismatches. It may only be constructed when `AGNES_TRUSTED_CONTEXT_HEADERS=true`; otherwise server startup must not silently enable it.

- [ ] **Step 5: Run permissions tests**

Run: `npm test -- tests/unit/kidsworld-permissions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/kidsworld/kidsworld-capabilities.ts src/transport/request-context.ts tests/unit/kidsworld-permissions.test.ts
git commit -m "feat: authorize KidsWorld server actions"
```

---

### Task 8: Zod-Validated KidsWorld HTTP API and Composition Root

**Files:**
- Create: `src/transport/kidsworld-routes.ts`
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Test: `tests/transport/kidsworld-routes.test.ts`
- Test: `tests/unit/build-app.test.ts`

**Interfaces:**
- Consumes: Tasks 3–7 services, `RequestContextResolver`.
- Produces: stable `/api/kidsworld` endpoints.

- [ ] **Step 1: Write failing Fastify injection tests**

Cover:

```ts
it('returns only KidsWorld profiles in the current household', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/kidsworld', headers: childHeaders });
  expect(response.statusCode).toBe(200);
  expect(response.json().children).toEqual(expect.arrayContaining([expect.objectContaining({ personId: childId })]));
});

it('returns 403 when a child requests parent summary', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/kidsworld/parent-summary', headers: childHeaders });
  expect(response.statusCode).toBe(403);
});

it('completes a mission idempotently', async () => {
  const first = await app.inject({ method: 'POST', url: `/api/kidsworld/${childId}/missions/${missionId}/complete`, headers: childHeaders });
  const second = await app.inject({ method: 'POST', url: `/api/kidsworld/${childId}/missions/${missionId}/complete`, headers: childHeaders });
  expect(first.statusCode).toBe(200);
  expect(second.statusCode).toBe(200);
  expect(second.json().alreadyCompleted).toBe(true);
});
```

- [ ] **Step 2: Run route tests and verify RED**

Run: `npm test -- tests/transport/kidsworld-routes.test.ts`

Expected: FAIL because routes are absent.

- [ ] **Step 3: Register exact route set with Zod validation**

Implement:

```text
GET  /api/kidsworld
GET  /api/kidsworld/:personId/dashboard?date=YYYY-MM-DD
GET  /api/kidsworld/:personId/content/:feature
POST /api/kidsworld/:personId/missions/:missionId/complete
POST /api/kidsworld/:personId/learning-sessions
POST /api/kidsworld/:personId/routines/:routine/steps/:stepKey/complete
POST /api/kidsworld/:personId/reward-requests
GET  /api/kidsworld/parent-summary
POST /api/kidsworld/reward-requests/:requestId/approve
```

Define Zod schemas for params/query/body. Map validation to `400`, authorization to `403`, missing entities to `404`, domain conflicts to `409`, unavailable optional dependency to `503`, unexpected failures to `500` without leaking SQL or foreign-person data.

- [ ] **Step 4: Wire repository and services through `buildApp`**

Extend `AgnesApp` with:

```ts
readonly kidsWorldRepository: PostgresKidsWorldRepository;
readonly kidsWorld: {
  readonly completeMission: typeof completeMission;
  readonly recordLearningSession: typeof recordLearningSession;
  readonly completeRoutineStep: typeof completeRoutineStep;
  readonly requestReward: typeof requestReward;
  readonly approveReward: typeof approveReward;
  readonly getDashboard: typeof getKidsWorldDashboard;
  readonly getParentSummary: typeof getParentSummary;
};
```

Construct one `PostgresKidsWorldRepository(pool, outboxRepository)` and closures that capture `SystemClock`, repositories, and service dependencies.

- [ ] **Step 5: Register routes in server with explicit trusted-local context setting**

If `AGNES_TRUSTED_CONTEXT_HEADERS !== 'true'`, do not register a spoofable header resolver; fail startup with a clear message until a production resolver is supplied. For local/demo use, construct `TrustedHeaderRequestContextResolver` and register routes.

- [ ] **Step 6: Run transport and build-app tests**

Run: `npm test -- tests/transport/kidsworld-routes.test.ts tests/unit/build-app.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/transport/kidsworld-routes.ts src/app/build-app.ts src/app/server.ts tests/transport/kidsworld-routes.test.ts tests/unit/build-app.test.ts
git commit -m "feat: expose KidsWorld API"
```

---

### Task 9: React/Vite Client Scaffold and Typed API Client

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/app/App.tsx`
- Create: `web/src/app/router.tsx`
- Create: `web/src/api/contracts.ts`
- Create: `web/src/api/kidsworld-api.ts`
- Create: `web/src/styles/tokens.css`
- Create: `web/src/styles/global.css`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: Task 8 HTTP endpoints.
- Produces: buildable/testable web app and API functions used by all UI pages.

- [ ] **Step 1: Create web package and install dependencies**

From repo root:

```bash
mkdir -p web
cd web
npm init -y
npm install react react-dom react-router-dom
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
cd ..
```

Set web scripts exactly to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Add root control scripts**

Add to root `package.json`:

```json
"web:build": "npm --prefix web run build",
"web:test": "npm --prefix web test",
"web:dev": "npm --prefix web run dev",
"check:all": "npm run check && npm run web:build && npm run web:test"
```

Run `npm install --package-lock-only` at root if root lock metadata changes from script edits; do not add React packages to the backend package.

- [ ] **Step 3: Write failing app smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the KidsWorld entry route', () => {
  render(<App initialEntries={['/kids']} />);
  expect(screen.getByRole('heading', { name: /kidsworld/i })).toBeInTheDocument();
});
```

Run: `npm --prefix web test -- src/app/App.test.tsx`

Expected: FAIL because App/router do not exist.

- [ ] **Step 4: Implement router and API client contracts**

`kidsworld-api.ts` exposes:

```ts
export const kidsWorldApi = {
  listChildren(signal?: AbortSignal): Promise<KidsWorldChildrenResponse>,
  getDashboard(personId: string, date: string, signal?: AbortSignal): Promise<KidsWorldDashboardResponse>,
  getContent(personId: string, feature: FeatureKey, signal?: AbortSignal): Promise<KidsWorldContentResponse>,
  completeMission(personId: string, missionId: string): Promise<MissionCompletionResponse>,
  recordLearning(personId: string, input: LearningSessionInput): Promise<LearningSessionResponse>,
  completeRoutine(personId: string, routine: string, stepKey: string, localDate: string): Promise<RoutineCompletionResponse>,
  requestReward(personId: string, rewardId: string): Promise<RewardRequestResponse>,
  getParentSummary(signal?: AbortSignal): Promise<ParentSummaryResponse>,
  approveReward(requestId: string): Promise<RewardRequestResponse>,
};
```

All fetches use same-origin `/api` URLs, `credentials: 'same-origin'`, JSON error parsing, and `AbortSignal` for reads. Development trusted-context headers are supplied by one configurable fetch wrapper, not scattered across pages.

- [ ] **Step 5: Implement global visual tokens and reduced motion**

`tokens.css` defines semantic variables only: deep/slate purple background, pastel purple, blue, mint, warm gold, card radius, shadows, spacing, and 44px minimum interactive size. `global.css` includes:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Run web smoke test and production build**

Run:

```bash
npm --prefix web test -- src/app/App.test.tsx
npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web package.json package-lock.json
git commit -m "feat: scaffold KidsWorld web client"
```

---

### Task 10: Shared KidsWorld Shell, Profile Chooser, and Home Navigation

**Files:**
- Create: `web/src/components/KidsWorldShell.tsx`
- Create: `web/src/components/ChildProfileCard.tsx`
- Create: `web/src/components/StarMeter.tsx`
- Create: `web/src/components/CompanionPrompt.tsx`
- Create: `web/src/components/FeatureCard.tsx`
- Create: `web/src/components/AsyncState.tsx`
- Create: `web/src/pages/ProfileChooserPage.tsx`
- Create: `web/src/pages/KidsHomePage.tsx`
- Modify: `web/src/app/router.tsx`
- Test: `web/src/pages/ProfileChooserPage.test.tsx`

**Interfaces:**
- Consumes: `kidsWorldApi.listChildren`, child summary DTO.
- Produces: `/kids` and `/kids/:personId` route UX, shared navigation shell used by all later pages.

- [ ] **Step 1: Write failing chooser interaction test**

```tsx
it('renders API children and navigates using personId instead of name', async () => {
  server.listChildren.mockResolvedValue({ children: [vasilisDto, eleniosDto] });
  renderKidsRoute('/kids');
  expect(await screen.findByRole('button', { name: /Vasilis World/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Vasilis World/i }));
  expect(location.pathname).toBe(`/kids/${vasilisDto.personId}`);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm --prefix web test -- src/pages/ProfileChooserPage.test.tsx`

Expected: FAIL because chooser/shell components do not exist.

- [ ] **Step 3: Implement shared shell and semantic feature navigation**

The home screen uses interactive cards for `Σήμερα`, `Σχολείο`, `Εξερεύνηση`, `Ιστορίες`, `Παιχνίδια`, `Δημιουργία`, `Ανταμοιβές`, `Ώρα Ύπνου`. Do not use the concept image as one clickable background. Every card is a real `<Link>` or `<button>` with visible focus style and at least 44px hit area.

- [ ] **Step 4: Implement loading/error/empty states**

`AsyncState` must render explicit Greek messages:

```text
Loading: "Φορτώνουμε το KidsWorld…"
Empty:   "Δεν υπάρχει ακόμη παιδικό προφίλ στο KidsWorld."
Error:   "Δεν μπορέσαμε να φορτώσουμε το KidsWorld. Δοκίμασε ξανά."
```

No blank dashboard states.

- [ ] **Step 5: Run chooser test and web build**

Run:

```bash
npm --prefix web test -- src/pages/ProfileChooserPage.test.tsx
npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components web/src/pages/ProfileChooserPage.tsx web/src/pages/KidsHomePage.tsx web/src/app/router.tsx
git commit -m "feat: add KidsWorld profile and home shell"
```

---

### Task 11: My Day, Mission Completion, and Rewards UI

**Files:**
- Create: `web/src/pages/MyDayPage.tsx`
- Create: `web/src/pages/RewardsPage.tsx`
- Modify: `web/src/app/router.tsx`
- Test: `web/src/pages/MyDayPage.test.tsx`
- Test: `web/src/pages/RewardsPage.test.tsx`

**Interfaces:**
- Consumes: Task 8 dashboard, mission completion, reward request endpoints.
- Produces: functional Today timeline and persisted reward interactions.

- [ ] **Step 1: Write failing My Day test**

```tsx
it('completes a mission only after server success and refreshes stars', async () => {
  api.getDashboard.mockResolvedValueOnce(dashboardBefore).mockResolvedValueOnce(dashboardAfter);
  api.completeMission.mockResolvedValue({ alreadyCompleted: false, awardedStars: 10 });
  renderKidsRoute(`/kids/${childId}/today`);
  await user.click(await screen.findByRole('button', { name: /5 λεπτά ανάγνωση/i }));
  expect(api.completeMission).toHaveBeenCalledWith(childId, missionId);
  expect(await screen.findByText('110')).toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing reward request test**

```tsx
it('shows a pending state after requesting a parent-approved reward', async () => {
  api.requestReward.mockResolvedValue({ requestId, status: 'pending' });
  renderKidsRoute(`/kids/${childId}/rewards`);
  await user.click(await screen.findByRole('button', { name: /Movie Night/i }));
  expect(await screen.findByText(/Περιμένει έγκριση/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npm --prefix web test -- src/pages/MyDayPage.test.tsx src/pages/RewardsPage.test.tsx`

Expected: FAIL because pages do not exist.

- [ ] **Step 4: Implement My Day**

Render the server-sorted timeline; do not recompute calendar date logic in React. Mission buttons disable during mutation. Permanent star totals update only after server confirmation. Show a stale/read-only banner if dashboard refresh fails after an earlier successful load.

- [ ] **Step 5: Implement Rewards**

Render active catalog rewards, affordability, pending requests, and request buttons. Do not present real-money language. Server response is authoritative for balance/request status.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm --prefix web test -- src/pages/MyDayPage.test.tsx src/pages/RewardsPage.test.tsx
npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/MyDayPage.tsx web/src/pages/RewardsPage.tsx web/src/pages/*.test.tsx web/src/app/router.tsx
git commit -m "feat: add KidsWorld day and rewards interactions"
```

---

### Task 12: School, Explorer, Stories, Games, Create Studio, and Bedtime Routes

**Files:**
- Create: `web/src/pages/SchoolWorldPage.tsx`
- Create: `web/src/pages/ExplorerWorldPage.tsx`
- Create: `web/src/pages/StoriesPage.tsx`
- Create: `web/src/pages/GamesPage.tsx`
- Create: `web/src/pages/CreateStudioPage.tsx`
- Create: `web/src/pages/BedtimePage.tsx`
- Modify: `web/src/app/router.tsx`
- Test: `web/src/pages/FeaturePages.test.tsx`

**Interfaces:**
- Consumes: Task 6 content endpoint and Task 4 learning/routine mutations.
- Produces: all remaining required child-facing v1 routes as functional UI, not screenshots.

- [ ] **Step 1: Write one route-contract test covering every feature**

```tsx
it.each([
  ['school', 'School World'],
  ['explore', 'Explorer World'],
  ['stories', 'Ηρακλής'],
  ['games', 'Παιχνίδια'],
  ['create', 'Δημιουργία'],
  ['bedtime', 'Ώρα Ύπνου'],
])('renders %s from catalog API', async (route, expectedText) => {
  api.getContent.mockResolvedValue(contentByFeature[route]);
  renderKidsRoute(`/kids/${childId}/${route}`);
  expect(await screen.findByText(expectedText)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm --prefix web test -- src/pages/FeaturePages.test.tsx`

Expected: FAIL because feature pages are absent.

- [ ] **Step 3: Implement School and Explorer**

School renders five subject cards and records a learning session only when a curated activity is marked complete. Explorer renders mission cards with progress and uses mission completion endpoint for finished exploration missions.

- [ ] **Step 4: Implement Stories and Games**

Stories renders the curated Hercules first-labor branch choices from content payload; completing its final node calls mission completion if a mission reference exists. Games are short catalog activities; only explicit completion records a mission/session—opening a game never awards stars.

- [ ] **Step 5: Implement Create Studio and Bedtime without free-form model calls**

Create Studio presents the four curated modes (`Ζωγραφίζω`, `Γράφω Ιστορία`, `Comic`, `Ηχογράφηση`) as local/typed experiences and stores no public content. Bedtime renders story/sounds/yoga/day-reflection catalog items and persists routine steps such as `story`, `sounds`, and `bedtime` through the routine endpoint.

- [ ] **Step 6: Run feature test and build**

Run:

```bash
npm --prefix web test -- src/pages/FeaturePages.test.tsx
npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/SchoolWorldPage.tsx web/src/pages/ExplorerWorldPage.tsx web/src/pages/StoriesPage.tsx web/src/pages/GamesPage.tsx web/src/pages/CreateStudioPage.tsx web/src/pages/BedtimePage.tsx web/src/pages/FeaturePages.test.tsx web/src/app/router.tsx
git commit -m "feat: add KidsWorld learning and activity worlds"
```

---

### Task 13: Parent Summary, Responsive Layout, and Accessibility Regression

**Files:**
- Create: `web/src/pages/ParentSummaryPage.tsx`
- Modify: `web/src/components/KidsWorldShell.tsx`
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/styles/global.css`
- Test: `web/src/pages/ParentSummaryPage.test.tsx`
- Test: `web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: parent summary and approval APIs.
- Produces: parent-only overview plus monitor/tablet/mobile layout behavior.

- [ ] **Step 1: Write failing parent summary authorization/UI test**

```tsx
it('shows child summaries and approves a pending reward for a parent context', async () => {
  api.getParentSummary.mockResolvedValue(parentSummary);
  api.approveReward.mockResolvedValue({ requestId, status: 'approved' });
  renderKidsRoute('/kids/parent', { actorMode: 'parent' });
  expect(await screen.findByText(/Vasilis/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Έγκριση Movie Night/i }));
  expect(api.approveReward).toHaveBeenCalledWith(requestId);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm --prefix web test -- src/pages/ParentSummaryPage.test.tsx`

Expected: FAIL because parent page is absent.

- [ ] **Step 3: Implement concise parent page**

Each child card displays only completed/remaining missions, learning minutes/subject progress, stars earned/spent, milestones, pending reward requests, and tomorrow-preparation items supplied by the API. Do not expose backend diagnostics or game-only chrome.

- [ ] **Step 4: Add responsive breakpoints and navigation behavior**

Use three layout bands:

```css
/* mobile */
@media (max-width: 719px) { /* single-column cards + fixed bottom navigation */ }
/* tablet */
@media (min-width: 720px) and (max-width: 1199px) { /* two-column adaptive grid */ }
/* monitor/TV */
@media (min-width: 1200px) { /* spatial dashboard grid with persistent side/top navigation */ }
```

Do not set hover-only affordances. Every interactive element must have `:focus-visible`. Use semantic headings and buttons/links.

- [ ] **Step 5: Add accessibility assertions**

In `App.test.tsx`, assert that route navigation can be found by role, active page has one level-1 heading, action buttons have accessible names, and no interactive element is rendered as a bare clickable `<div>`.

- [ ] **Step 6: Run all web tests and build**

Run:

```bash
npm --prefix web test
npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/ParentSummaryPage.tsx web/src/pages/ParentSummaryPage.test.tsx web/src/components/KidsWorldShell.tsx web/src/styles web/src/app/App.test.tsx
git commit -m "feat: finish KidsWorld parent and responsive UX"
```

---

### Task 14: Seeded Vertical Slice, Full E2E, CI, and Regression Verification

**Files:**
- Create: `src/kidsworld/dev-seed.ts`
- Create: `tests/e2e/kidsworld-vertical-slice.test.ts`
- Modify: `.github/workflows/core-ci.yml`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: reproducible development data, one full backend vertical slice, CI verification, operating documentation.

- [ ] **Step 1: Create deterministic dev seed helper**

Expose a function, not an automatic production side effect:

```ts
export interface KidsWorldSeedResult {
  householdId: HouseholdId;
  parentPersonId: PersonId;
  childPersonIds: readonly PersonId[];
}

export async function seedKidsWorldDevelopmentData(deps: SeedDeps): Promise<KidsWorldSeedResult>;
```

Seed one parent with `kids-parent-v1`, two child profiles with `kids-child-v1`, sample calendar entries, one mission per feature, reward catalog items, and no dependency on display names in service logic.

- [ ] **Step 2: Write the end-to-end test before updating CI**

The test must:

```ts
it('runs calendar -> dashboard -> mission -> stars -> learning -> parent summary end to end', async () => {
  const seed = await seedKidsWorldDevelopmentData(deps);
  const dashboard = await kidsWorld.getDashboard({ householdId: seed.householdId, personId: seed.childPersonIds[0]!, localDate: '2026-09-01' });
  const mission = dashboard.missions[0]!;
  const completed = await kidsWorld.completeMission({ householdId: seed.householdId, personId: seed.childPersonIds[0]!, missionId: mission.id });
  expect(completed.awardedStars).toBeGreaterThan(0);
  await kidsWorld.recordLearningSession(learningInput);
  const parent = await kidsWorld.getParentSummary({ householdId: seed.householdId, actorPersonId: seed.parentPersonId, localDate: '2026-09-01' });
  expect(parent.children[0]!.completedMissions).toBeGreaterThan(0);
});
```

Then query `kidsworld_star_ledger` and `outbox_events` to assert exactly one mission award and one `kidsworld.mission.completed.v1` event for the mission correlation.

- [ ] **Step 3: Run the full local verification sequence**

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_kidsworld.sql
npm run format:check
npm run lint
npm run build
npm test
npm test -- tests/e2e/calendar-to-notification.test.ts
npm test -- tests/e2e/kidsworld-vertical-slice.test.ts
npm --prefix web test
npm --prefix web run build
```

Expected: every command exits 0.

- [ ] **Step 4: Extend CI**

After root `npm ci`, add `npm ci --prefix web`. Apply `001_core.sql` then `002_kidsworld.sql`. Add web test/build steps and KidsWorld E2E step while preserving the existing calendar-to-notification E2E and formatting checks.

- [ ] **Step 5: Document local operation**

Add to `.env.example`:

```text
AGNES_TRUSTED_CONTEXT_HEADERS=false
```

README must state that trusted identity headers are local/demo-only, show the two migrations required for KidsWorld, and document root commands `npm run check:all` and `npm run web:dev`. Do not describe header mode as production authentication.

- [ ] **Step 6: Run final verification again after docs/CI edits**

Run:

```bash
npm run format:check && npm run lint && npm run build && npm test && npm --prefix web test && npm --prefix web run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/kidsworld/dev-seed.ts tests/e2e/kidsworld-vertical-slice.test.ts .github/workflows/core-ci.yml README.md .env.example
git commit -m "test: verify KidsWorld vertical slice"
```

---

## Final Acceptance Gate

Before opening or merging the implementation PR, verify every spec acceptance criterion explicitly:

- [ ] Profile chooser comes from API data and routes by `PersonId`.
- [ ] All nine child surfaces plus Parent Summary are real routes/components, not flattened screenshots.
- [ ] My Day composes calendar + missions + routines in the child's timezone.
- [ ] Mission retries/concurrent requests award stars exactly once.
- [ ] Learning and routine progress survive process restarts.
- [ ] Reward requests persist and approval is parent-authorized server-side.
- [ ] Parent Summary reflects persisted child actions.
- [ ] Cross-household, sibling-target, and child-to-parent privilege attempts return authorization errors without leaking state.
- [ ] Monitor, tablet, and mobile layouts work from the same component system.
- [ ] Loading, stale, empty, and error states are visible and actionable.
- [ ] Curated content powers School/Explorer/Stories/Games/Create/Bedtime without unrestricted AI generation.
- [ ] Existing Core unit/integration/E2E tests remain green.
- [ ] Web test and production build are green.
- [ ] PostgreSQL KidsWorld integration and E2E tests are green.
- [ ] CI applies both migrations and executes both Core and KidsWorld verification.
