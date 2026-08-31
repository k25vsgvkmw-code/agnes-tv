# KidsWorld v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first real KidsWorld vertical slice inside AGNES: persisted child profiles, My Day, learning/routines, rewards, curated feature worlds, parent summary, responsive web UI, and verified end-to-end behavior.

**Architecture:** Keep the existing AGNES Core in `src/` and add an isolated `src/kidsworld/` domain/application boundary backed by PostgreSQL and the existing transactional outbox. Add a React + TypeScript + Vite client under `web/`, served in production by Fastify from `web/dist`, with all permanent progression driven by `/api/kidsworld` responses. Canonical identity remains `Person`; KidsWorld state is keyed by `PersonId`/`HouseholdId`.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, PostgreSQL 18, Zod 4, Vitest 3, React, React DOM, React Router, Vite, Testing Library, `@js-temporal/polyfill`, `@fastify/static`, CSS Modules/plain CSS.

**Spec:** `docs/superpowers/specs/2026-08-31-kidsworld-v1-design.md`

## Global Constraints

- Do not reintroduce legacy AGNES screen architecture or move Core into a monorepo workspace.
- Identity stays canonical in `people`; no duplicate child identity records and no routing by hard-coded names.
- Mission completion, star awards, learning sessions, routine steps, and reward approval are idempotent and transactional.
- KidsWorld events use the existing outbox in the same PostgreSQL transaction as state changes.
- Authorization is server-side. Child URLs never grant sibling, parent, or cross-household access.
- Trusted identity headers are local/demo-only and require `AGNES_TRUSTED_CONTEXT_HEADERS=true`.
- Free-form child AI/chat is out of scope. School/Explorer/Stories/Games/Create/Bedtime use curated typed content.
- Greek is the default child UI language; English is used only for learning content or established product labels.
- Monitor/TV, tablet, and mobile share one component system. Interactive targets are at least 44 CSS px; reduced-motion is honored.
- Existing Core tests and CI must remain green.

---

### Task 1: Domain IDs, Profiles, Missions, Stars, Learning, Routines, and Rewards

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
- Consumes: `HouseholdId`, `PersonId`, `ValidationError`.
- Produces: `KidsWorldMissionId`, `StarLedgerEntryId`, `LearningSessionId`, `RewardId`, `RewardRequestId`, and pure domain records used by every later task.

- [ ] **Step 1: Write the failing domain test**

```ts
import { describe, expect, it } from 'vitest';
import { createKidsWorldProfile } from '../../src/kidsworld/kidsworld-profile.js';
import { createMission, completeMissionRecord } from '../../src/kidsworld/mission.js';
import { createStarLedgerEntry } from '../../src/kidsworld/star-ledger.js';

const householdId = '00000000-0000-4000-8000-000000000001' as never;
const personId = '00000000-0000-4000-8000-000000000002' as never;

describe('KidsWorld domain', () => {
  it('starts progression at zero', () => {
    expect(createKidsWorldProfile({ householdId, personId, avatarKey: 'blue' })).toMatchObject({
      householdId,
      personId,
      xp: 0,
      starsBalance: 0,
      status: 'active',
    });
  });

  it('completes an available mission once', () => {
    const mission = createMission({
      householdId,
      personId,
      type: 'learning',
      title: '5 λεπτά ανάγνωση',
      scheduledFor: new Date('2026-09-01T14:00:00Z'),
      rewardStars: 10,
      source: 'system',
    });
    const done = completeMissionRecord(mission, new Date('2026-09-01T14:05:00Z'));
    expect(done.status).toBe('completed');
    expect(() => completeMissionRecord(done, new Date())).toThrow(/already completed/i);
  });

  it('rejects zero-value ledger entries', () => {
    expect(() => createStarLedgerEntry({ householdId, personId, amount: 0, reason: 'x', correlationId: 'x' }))
      .toThrow(/amount/i);
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/kidsworld-domain.test.ts`

Expected: FAIL because KidsWorld modules/IDs do not exist.

- [ ] **Step 3: Implement exact primitive types and constructors**

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

Use these exact unions:

```ts
export type KidsWorldProfileStatus = 'active' | 'inactive';
export type MissionType = 'routine' | 'learning' | 'activity' | 'exploration' | 'story' | 'creative';
export type MissionStatus = 'available' | 'completed' | 'expired' | 'cancelled';
export type MissionSource = 'system' | 'calendar' | 'parent' | 'content';
export type LearningSubject = 'maths' | 'greek' | 'english' | 'science' | 'geography';
export type RoutineType = 'morning' | 'after-school' | 'bedtime';
export type RewardRequestStatus = 'pending' | 'approved' | 'rejected';
```

`createKidsWorldProfile` defaults `companionKey='agnes-dino'`, `themeKey='kidsworld-default'`, `xp=0`, `starsBalance=0`. `createMission` requires non-empty title and `rewardStars > 0`. `completeMissionRecord` only accepts `available`. `createStarLedgerEntry` requires `amount !== 0` and non-empty correlation ID. Learning duration must be positive. Routine local date must match `YYYY-MM-DD`. Reward cost must be positive.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/kidsworld-domain.test.ts tests/unit/kernel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/kernel/ids.ts src/kidsworld tests/unit/kidsworld-domain.test.ts
git commit -m "feat: add KidsWorld domain primitives"
```

---

### Task 2: PostgreSQL Schema and Repository

**Files:**
- Create: `src/persistence/migrations/002_kidsworld.sql`
- Create: `src/kidsworld/kidsworld-repository.ts`
- Create: `src/persistence/postgres-kidsworld-repository.ts`
- Test: `tests/integration/postgres-kidsworld-repository.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types, existing `OutboxRepository`.
- Produces: `KidsWorldRepository`, `KidsWorldTransaction`, `PostgresKidsWorldRepository`.

- [ ] **Step 1: Write RED repository test**

```ts
it('round-trips profile, mission, learning, routine and rewards', async () => {
  await repository.saveProfile(profile);
  await repository.saveMission(mission);
  await repository.saveReward(reward);

  expect(await repository.getProfile(person.id)).toMatchObject({ personId: person.id, starsBalance: 0 });
  expect(await repository.getMission(mission.id)).toMatchObject({ status: 'available' });
  expect(await repository.listRewards(household.id)).toEqual([expect.objectContaining({ id: reward.id })]);
});
```

Run after only migration 001:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
npm test -- tests/integration/postgres-kidsworld-repository.test.ts
```

Expected: FAIL because migration 002/repository do not exist.

- [ ] **Step 2: Create the complete relational migration**

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
  type text not null check (type in ('routine','learning','activity','exploration','story','creative')),
  title text not null,
  description text,
  scheduled_for timestamptz not null,
  reward_stars integer not null check (reward_stars > 0),
  status text not null check (status in ('available','completed','expired','cancelled')),
  source text not null check (source in ('system','calendar','parent','content')),
  source_reference text,
  completed_at timestamptz
);
create index if not exists kidsworld_missions_person_schedule_idx
  on kidsworld_missions(person_id, scheduled_for, status);

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

create table if not exists kidsworld_learning_progress (
  person_id uuid not null references people(id) on delete cascade,
  subject text not null check (subject in ('maths','greek','english','science','geography')),
  level integer not null default 1 check (level >= 1),
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  total_minutes integer not null default 0 check (total_minutes >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  updated_at timestamptz not null,
  primary key (person_id, subject)
);

create table if not exists kidsworld_learning_sessions (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  subject text not null check (subject in ('maths','greek','english','science','geography')),
  duration_minutes integer not null check (duration_minutes > 0),
  completed_at timestamptz not null,
  correlation_id text not null,
  unique (person_id, correlation_id)
);

create table if not exists kidsworld_routine_progress (
  person_id uuid not null references people(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  local_date date not null,
  routine text not null check (routine in ('morning','after-school','bedtime')),
  step_key text not null,
  completed_at timestamptz not null,
  primary key (person_id, local_date, routine, step_key)
);

create table if not exists kidsworld_rewards (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text not null,
  cost_stars integer not null check (cost_stars > 0),
  requires_parent_approval boolean not null default true,
  active boolean not null default true
);

create table if not exists kidsworld_reward_requests (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  reward_id uuid not null references kidsworld_rewards(id) on delete restrict,
  status text not null check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null,
  decided_at timestamptz,
  decided_by_person_id uuid references people(id) on delete set null
);
create index if not exists kidsworld_reward_requests_household_status_idx
  on kidsworld_reward_requests(household_id, status, requested_at);
```

- [ ] **Step 3: Define repository/transaction interfaces**

```ts
export interface KidsWorldTransaction {
  getMissionForUpdate(id: KidsWorldMissionId): Promise<Mission | null>;
  markMissionCompleted(id: KidsWorldMissionId, completedAt: Date): Promise<boolean>;
  appendStarEntry(entry: StarLedgerEntry): Promise<boolean>;
  updateProfileProgress(personId: PersonId, xpDelta: number, starDelta: number): Promise<KidsWorldProfile>;
  saveLearningSession(session: LearningSession): Promise<boolean>;
  getLearningProgressForUpdate(personId: PersonId, subject: LearningSubject): Promise<LearningProgress | null>;
  upsertLearningProgress(progress: LearningProgress): Promise<void>;
  completeRoutineStep(step: RoutineStepCompletion): Promise<boolean>;
  getRewardForUpdate(id: RewardId): Promise<Reward | null>;
  saveRewardRequest(request: RewardRequest): Promise<void>;
  getRewardRequestForUpdate(id: RewardRequestId): Promise<RewardRequest | null>;
  updateRewardRequest(request: RewardRequest): Promise<void>;
  appendEvent(event: AgnesEvent): Promise<void>;
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
  listStarEntries(personId: PersonId, from: Date, to: Date): Promise<readonly StarLedgerEntry[]>;
}
```

- [ ] **Step 4: Implement PostgreSQL mapping and transaction wrapper**

Use this transaction shape exactly:

```ts
async transaction<T>(work: (tx: KidsWorldTransaction) => Promise<T>): Promise<T> {
  const client = await this.pool.connect();
  try {
    await client.query('begin');
    const result = await work(this.createTransactionAdapter(client));
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
```

`appendStarEntry` uses `insert ... on conflict(person_id, correlation_id) do nothing returning id` and returns `rowCount === 1`. `markMissionCompleted` updates only `where id=$1 and status='available'`. `updateProfileProgress` uses `stars_balance + $delta` with a `stars_balance + $delta >= 0` guard and returns the updated row. `appendEvent` calls existing `outboxRepository.append(client, event)`.

- [ ] **Step 5: Apply migrations and run GREEN**

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

### Task 3: Transactional Mission, Learning, Routine, and Reward Mutations

**Files:**
- Create: `src/kidsworld/kidsworld-events.ts`
- Create: `src/kidsworld/complete-mission.ts`
- Create: `src/kidsworld/record-learning-session.ts`
- Create: `src/kidsworld/complete-routine-step.ts`
- Create: `src/kidsworld/request-reward.ts`
- Create: `src/kidsworld/approve-reward.ts`
- Test: `tests/unit/kidsworld-mutations.test.ts`
- Test: `tests/integration/kidsworld-transactions.test.ts`

**Interfaces:**
- Consumes: Task 2 repository transaction, existing `createAgnesEvent`, `Clock`.
- Produces: all persisted KidsWorld mutation services.

- [ ] **Step 1: Write RED unit tests for idempotency and affordability**

```ts
it('does not double-award a completed mission', async () => {
  const first = await completeMission(input, deps);
  const second = await completeMission(input, deps);
  expect(first.awardedStars).toBe(10);
  expect(second).toMatchObject({ awardedStars: 0, alreadyCompleted: true });
});

it('records a learning session once per correlation', async () => {
  await recordLearningSession(learningInput, deps);
  await recordLearningSession(learningInput, deps);
  expect(memory.sessions).toHaveLength(1);
  expect(memory.progress.totalMinutes).toBe(10);
});

it('returns created=false for a duplicate routine step', async () => {
  expect((await completeRoutineStep(routineInput, deps)).created).toBe(true);
  expect((await completeRoutineStep(routineInput, deps)).created).toBe(false);
});

it('rejects reward approval when balance is insufficient', async () => {
  await expect(approveReward(approvalInput, deps)).rejects.toThrow(/insufficient stars/i);
});
```

Run: `npm test -- tests/unit/kidsworld-mutations.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement exact event factories**

```ts
export const KIDS_WORLD_EVENT_TYPES = {
  missionCompleted: 'kidsworld.mission.completed.v1',
  starsAwarded: 'kidsworld.stars.awarded.v1',
  learningCompleted: 'kidsworld.learning.session.completed.v1',
  routineCompleted: 'kidsworld.routine.step.completed.v1',
  rewardRequested: 'kidsworld.reward.requested.v1',
  rewardApproved: 'kidsworld.reward.approved.v1',
} as const;
```

Every factory calls `createAgnesEvent` with `source: 'kidsworld'`, canonical household/actor IDs, stable entity IDs, and a deterministic correlation string based on the source domain ID.

- [ ] **Step 3: Implement mission completion in one transaction**

```ts
export interface MissionCompletionResult {
  mission: Mission;
  profile: KidsWorldProfile;
  awardedStars: number;
  alreadyCompleted: boolean;
}

export async function completeMission(input: CompleteMissionInput, deps: CompleteMissionDeps): Promise<MissionCompletionResult> {
  return deps.repository.transaction(async (tx) => {
    const mission = await tx.getMissionForUpdate(input.missionId);
    if (!mission || mission.householdId !== input.householdId || mission.personId !== input.personId) {
      throw new NotFoundError('mission not found');
    }
    if (mission.status === 'completed') {
      const profile = await deps.repository.getProfile(input.personId);
      if (!profile) throw new NotFoundError('profile not found');
      return { mission, profile, awardedStars: 0, alreadyCompleted: true };
    }
    const completedAt = deps.clock.now();
    if (!(await tx.markMissionCompleted(mission.id, completedAt))) {
      throw new ConflictError('mission state changed');
    }
    const entry = createStarLedgerEntry({
      householdId: mission.householdId,
      personId: mission.personId,
      amount: mission.rewardStars,
      reason: 'mission_completed',
      correlationId: `mission:${mission.id}`,
    });
    const inserted = await tx.appendStarEntry(entry);
    const profile = inserted
      ? await tx.updateProfileProgress(mission.personId, mission.rewardStars, mission.rewardStars)
      : (await deps.repository.getProfile(mission.personId))!;
    if (inserted) {
      await tx.appendEvent(createMissionCompletedEvent(mission, completedAt, deps.clock));
      await tx.appendEvent(createStarsAwardedEvent(entry, deps.clock));
    }
    return { mission: { ...mission, status: 'completed', completedAt }, profile, awardedStars: inserted ? mission.rewardStars : 0, alreadyCompleted: !inserted };
  });
}
```

If `NotFoundError`/`ConflictError` do not yet exist in `src/kernel/errors.ts`, add typed subclasses there and unit-test their names/messages.

- [ ] **Step 4: Implement learning/routine/reward services with deterministic correlations**

```ts
const learningCorrelation = `learning:${input.sessionId}`;
const routineCorrelation = `routine:${input.personId}:${input.localDate}:${input.routine}:${input.stepKey}`;
const rewardCorrelation = `reward:${request.id}`;
```

`recordLearningSession`: insert session; if duplicate, return current aggregate unchanged; otherwise increment `completedSessions`, `totalMinutes`, and streak deterministically, then append learning event.

`completeRoutineStep`: insert unique step; append routine event only when created.

`requestReward`: verify reward household/active; create `pending` when approval required. For non-approval rewards, lock/update profile and deduct stars transactionally before storing `approved`.

`approveReward`: lock request and reward; require `pending`; verify same household; insert a negative ledger entry using `rewardCorrelation`; update profile balance with negative delta; mark request approved with `decidedByPersonId` and `decidedAt`; append reward-approved event.

- [ ] **Step 5: Write exact concurrent/rollback integration tests**

```ts
it('awards one ledger row under concurrent mission completion', async () => {
  const [a, b] = await Promise.all([completeMission(input, deps), completeMission(input, deps)]);
  expect(a.awardedStars + b.awardedStars).toBe(mission.rewardStars);
  const ledger = await pool.query('select amount from kidsworld_star_ledger where person_id=$1 and correlation_id=$2', [personId, `mission:${mission.id}`]);
  expect(ledger.rows).toEqual([{ amount: mission.rewardStars }]);
});

it('rolls back reward approval and outbox when balance update fails', async () => {
  await pool.query('update kidsworld_profiles set stars_balance=0 where person_id=$1', [personId]);
  await expect(approveReward(approvalInput, deps)).rejects.toThrow(/insufficient stars/i);
  const request = await pool.query('select status from kidsworld_reward_requests where id=$1', [requestId]);
  const outbox = await pool.query("select event_id from outbox_events where correlation_id=$1", [`reward:${requestId}`]);
  expect(request.rows[0]?.status).toBe('pending');
  expect(outbox.rowCount).toBe(0);
});

it('stores one learning session on retry', async () => {
  await recordLearningSession(learningInput, deps);
  await recordLearningSession(learningInput, deps);
  const rows = await pool.query('select id from kidsworld_learning_sessions where id=$1', [learningInput.sessionId]);
  expect(rows.rowCount).toBe(1);
});

it('stores one routine step on retry', async () => {
  await completeRoutineStep(routineInput, deps);
  await completeRoutineStep(routineInput, deps);
  const rows = await pool.query('select step_key from kidsworld_routine_progress where person_id=$1 and local_date=$2 and routine=$3 and step_key=$4', [personId, routineInput.localDate, routineInput.routine, routineInput.stepKey]);
  expect(rows.rowCount).toBe(1);
});
```

Run: `npm test -- tests/unit/kidsworld-mutations.test.ts tests/integration/kidsworld-transactions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/kernel/errors.ts src/kidsworld tests/unit/kidsworld-mutations.test.ts tests/integration/kidsworld-transactions.test.ts
git commit -m "feat: add KidsWorld transactional mutations"
```

---

### Task 4: My Day, Parent Summary, and Curated Content

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/calendar/calendar-repository.ts`
- Modify: `src/persistence/postgres-calendar-repository.ts`
- Create: `src/kidsworld/get-dashboard.ts`
- Create: `src/kidsworld/get-parent-summary.ts`
- Create: `src/kidsworld/content/catalog.ts`
- Create: `src/kidsworld/content/get-content.ts`
- Test: `tests/unit/kidsworld-dashboard.test.ts`
- Test: `tests/unit/kidsworld-content.test.ts`

**Interfaces:**
- Consumes: calendar, people, KidsWorld repository.
- Produces: `getKidsWorldDashboard`, `getParentSummary`, `getKidsWorldContent`.

- [ ] **Step 1: Install exact date-boundary dependency and write RED tests**

Run: `npm install @js-temporal/polyfill`

Then add:

```ts
it('builds the Cyprus local day and merges calendar/missions in server order', async () => {
  const result = await getKidsWorldDashboard({ householdId, personId, localDate: '2026-10-25' }, deps);
  expect(result.localDate).toBe('2026-10-25');
  expect(result.timeline.map((x) => x.title)).toEqual(['Σχολείο', 'Αγγλικά', 'Πάρε μπουκάλι νερό']);
});

it('returns all six curated feature catalogs without external URLs', () => {
  for (const feature of ['school','explore','stories','games','create','bedtime'] as const) {
    const items = getKidsWorldContent(feature);
    expect(items.length).toBeGreaterThan(0);
    expect(JSON.stringify(items)).not.toMatch(/https?:\/\//);
  }
});
```

Run: `npm test -- tests/unit/kidsworld-dashboard.test.ts tests/unit/kidsworld-content.test.ts`

Expected: FAIL.

- [ ] **Step 2: Extend calendar repository with exact bounded query**

```ts
listRange(householdId: HouseholdId, from: Date, to: Date): Promise<readonly CalendarEvent[]>;
```

SQL:

```sql
select ... from calendar_events ce
where ce.household_id = $1
  and ce.status <> 'cancelled'
  and ce.starts_at < $3
  and ce.ends_at > $2
order by ce.starts_at, ce.id
```

Reuse the repository's existing external-reference mapping when selecting columns; do not fork a second row mapper.

- [ ] **Step 3: Implement exact local-day boundary and dashboard DTO**

```ts
import { Temporal } from '@js-temporal/polyfill';

function localDayBounds(localDate: string, timeZone: string): { from: Date; to: Date } {
  const start = Temporal.PlainDate.from(localDate).toZonedDateTime({ timeZone, plainTime: '00:00' });
  const end = start.add({ days: 1 });
  return { from: new Date(start.epochMilliseconds), to: new Date(end.epochMilliseconds) };
}

export interface KidsWorldDashboard {
  personId: PersonId;
  displayName: string;
  localDate: string;
  profile: KidsWorldProfile;
  timeline: readonly { id: string; kind: 'calendar' | 'mission' | 'routine'; title: string; startsAt: string | null; completed: boolean }[];
  missions: readonly Mission[];
  learning: readonly LearningProgress[];
  routines: readonly RoutineStepCompletion[];
  rewards: readonly Reward[];
  pendingRewardRequests: readonly RewardRequest[];
  features: Readonly<Record<'school' | 'explore' | 'stories' | 'games' | 'create' | 'bedtime', boolean>>;
}
```

Filter calendar items to `ownerPersonId === personId || participants.includes(personId)`. Timeline sorting is server-side by timestamp, then kind/id for deterministic ties.

- [ ] **Step 4: Implement parent summary with milestones**

```ts
export interface ParentChildSummary {
  personId: PersonId;
  displayName: string;
  completedMissions: number;
  remainingMissions: number;
  learningMinutes: number;
  starsEarned: number;
  starsSpent: number;
  milestones: readonly string[];
  pendingRewardRequests: number;
  tomorrowPreparation: readonly string[];
}
```

Derive `milestones` deterministically: `100-stars`, `first-learning-session`, `five-missions`, and `bedtime-streak-3` only when their persisted thresholds are met. `tomorrowPreparation` contains only next-day routine mission titles and explicit next-day calendar preparation metadata; if unavailable, return `[]`.

- [ ] **Step 5: Implement curated content with stable IDs**

```ts
export const kidsWorldCatalog = {
  school: [
    { id: 'maths-lab', feature: 'school', title: 'Maths Lab', subtitle: 'Μαθηματικά', skillTags: ['maths'], difficulty: 1, rewardStars: 10, iconKey: 'numbers', payload: { mode: 'practice' } },
    { id: 'greek-story-island', feature: 'school', title: 'Greek Story Island', subtitle: 'Ελληνικά', skillTags: ['greek'], difficulty: 1, rewardStars: 10, iconKey: 'book', payload: { mode: 'reading' } },
    { id: 'english-city', feature: 'school', title: 'English City', subtitle: 'Αγγλικά', skillTags: ['english'], difficulty: 1, rewardStars: 10, iconKey: 'bus', payload: { mode: 'dialogue' } },
    { id: 'science-lab', feature: 'school', title: 'Science Lab', subtitle: 'Επιστήμη', skillTags: ['science'], difficulty: 1, rewardStars: 10, iconKey: 'flask', payload: { mode: 'experiment' } },
    { id: 'geography-globe', feature: 'school', title: 'Geography Globe', subtitle: 'Γεωγραφία', skillTags: ['geography'], difficulty: 1, rewardStars: 10, iconKey: 'globe', payload: { mode: 'map' } },
  ],
  explore: [
    { id: 'london-mission', feature: 'explore', title: 'London Mission', subtitle: 'Βρες το Big Ben', skillTags: ['geography','english'], difficulty: 1, rewardStars: 40, iconKey: 'clock', payload: { destination: 'London' } },
    { id: 'athens-mission', feature: 'explore', title: 'Athens Mission', subtitle: 'Μάθε για την ιστορία', skillTags: ['geography'], difficulty: 1, rewardStars: 30, iconKey: 'temple', payload: { destination: 'Athens' } },
  ],
  stories: [{ id: 'hercules-first-labor', feature: 'stories', title: 'Ηρακλής', subtitle: 'Ο πρώτος άθλος', skillTags: ['greek','mythology'], difficulty: 1, rewardStars: 30, iconKey: 'story', payload: { choices: ['Ο Δρόμος της Δύναμης','Ο Δρόμος της Σοφίας'] } }],
  games: [{ id: 'math-racer', feature: 'games', title: 'Math Racer', subtitle: '3 λεπτά', skillTags: ['maths'], difficulty: 1, rewardStars: 10, iconKey: 'gamepad', payload: { durationMinutes: 3 } }],
  create: [{ id: 'draw', feature: 'create', title: 'Ζωγραφίζω', subtitle: 'Δημιούργησε εικόνα', skillTags: ['creative'], difficulty: 1, rewardStars: 10, iconKey: 'palette', payload: { mode: 'draw' } }],
  bedtime: [{ id: 'little-dragon-moon', feature: 'bedtime', title: 'Ο μικρός δράκος και το φεγγάρι', subtitle: '12 λεπτά', skillTags: ['bedtime'], difficulty: 1, rewardStars: 10, iconKey: 'moon', payload: { routineStep: 'story' } }],
} as const;
```

Add Paris/Space, two more games, the remaining three Create modes, sleep sounds, yoga, and day reflection using the same explicit shape before GREEN.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm test -- tests/unit/kidsworld-dashboard.test.ts tests/unit/kidsworld-content.test.ts tests/integration/postgres-repositories.test.ts
git add package.json package-lock.json src/calendar src/persistence/postgres-calendar-repository.ts src/kidsworld/get-dashboard.ts src/kidsworld/get-parent-summary.ts src/kidsworld/content tests/unit/kidsworld-dashboard.test.ts tests/unit/kidsworld-content.test.ts
git commit -m "feat: compose KidsWorld context and content"
```

---

### Task 5: Request Context, Capabilities, HTTP API, and App Wiring

**Files:**
- Create: `src/kidsworld/kidsworld-capabilities.ts`
- Create: `src/transport/request-context.ts`
- Create: `src/transport/kidsworld-routes.ts`
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Test: `tests/unit/kidsworld-permissions.test.ts`
- Test: `tests/transport/kidsworld-routes.test.ts`
- Modify: `tests/unit/build-app.test.ts`

**Interfaces:**
- Consumes: all backend services from Tasks 1–4.
- Produces: authorized `/api/kidsworld` HTTP contract.

- [ ] **Step 1: Write RED permission/route tests**

```ts
it('denies sibling target to a child grant set', () => {
  expect(authorizeKidsWorld(childContext, 'kidsworld.complete_mission_self', siblingId).allowed).toBe(false);
});

it('denies parent summary to a child', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/kidsworld/parent-summary', headers: childHeaders });
  expect(response.statusCode).toBe(403);
});

it('returns 400 for invalid dashboard date', async () => {
  const response = await app.inject({ method: 'GET', url: `/api/kidsworld/${childId}/dashboard?date=31-08-2026`, headers: childHeaders });
  expect(response.statusCode).toBe(400);
});
```

Run: `npm test -- tests/unit/kidsworld-permissions.test.ts tests/transport/kidsworld-routes.test.ts`

Expected: FAIL.

- [ ] **Step 2: Define capabilities and trusted-local request context**

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

export interface RequestContext {
  householdId: HouseholdId;
  actorPersonId: PersonId;
  grants: Readonly<Record<KidsWorldCapability, CapabilityGrant>>;
}
```

Grant profiles:

```ts
export const childKidsWorldGrants = {
  'kidsworld.read_self': { view: true, suggest: false, act: false },
  'kidsworld.complete_mission_self': { view: true, suggest: true, act: true },
  'kidsworld.record_learning_self': { view: true, suggest: true, act: true },
  'kidsworld.complete_routine_self': { view: true, suggest: true, act: true },
  'kidsworld.request_reward_self': { view: true, suggest: true, act: true },
  'kidsworld.read_household': { view: false, suggest: false, act: false },
  'kidsworld.manage_rewards': { view: false, suggest: false, act: false },
  'kidsworld.approve_rewards': { view: false, suggest: false, act: false },
} satisfies Record<KidsWorldCapability, CapabilityGrant>;
```

Parent grants set `read_household/manage_rewards/approve_rewards` to allowed. `TrustedHeaderRequestContextResolver` reads `x-agnes-household-id` and `x-agnes-actor-person-id`, loads people through `householdRepository.listPeople(householdId)`, requires active actor membership, and maps `permissionsProfileId` `kids-child-v1`/`kids-parent-v1`. Unknown profiles deny all.

- [ ] **Step 3: Implement authorization helper and exact routes**

```ts
export function authorizeKidsWorld(context: RequestContext, capability: KidsWorldCapability, targetPersonId?: PersonId): PolicyDecision {
  if (capability.endsWith('_self') && targetPersonId !== context.actorPersonId) {
    return { allowed: false, requiresConfirmation: false, capability };
  }
  return evaluateCapability({ capability, requested: capability.endsWith('_self') ? 'act' : 'view', grant: context.grants[capability] });
}
```

Register with Zod:

```text
GET  /api/kidsworld
GET  /api/kidsworld/:personId/dashboard?date=YYYY-MM-DD
GET  /api/kidsworld/:personId/content/:feature
POST /api/kidsworld/:personId/missions/:missionId/complete
POST /api/kidsworld/:personId/learning-sessions
POST /api/kidsworld/:personId/routines/:routine/steps/:stepKey/complete
POST /api/kidsworld/:personId/reward-requests
GET  /api/kidsworld/parent-summary?date=YYYY-MM-DD
POST /api/kidsworld/reward-requests/:requestId/approve
```

`GET /api/kidsworld`: parent grant returns all household profiles; child grant returns only self. Map Zod errors to 400, denied capability to 403, missing records to 404, state conflicts to 409, optional provider unavailable to 503, unexpected errors to 500 without SQL details.

- [ ] **Step 4: Wire app services**

```ts
export interface KidsWorldServices {
  completeMission(input: CompleteMissionInput): Promise<MissionCompletionResult>;
  recordLearningSession(input: RecordLearningInput): Promise<LearningSessionResult>;
  completeRoutineStep(input: CompleteRoutineInput): Promise<RoutineCompletionResult>;
  requestReward(input: RequestRewardInput): Promise<RewardRequest>;
  approveReward(input: ApproveRewardInput): Promise<RewardRequest>;
  getDashboard(input: GetDashboardInput): Promise<KidsWorldDashboard>;
  getParentSummary(input: GetParentSummaryInput): Promise<ParentSummary>;
  getContent(feature: KidsWorldFeature): readonly KidsWorldContentItem[];
}
```

Add `kidsWorldRepository` and `kidsWorld` to `AgnesApp`. Construct one `PostgresKidsWorldRepository(pool, outboxRepository)` and one `SystemClock` dependency. Register routes in `server.ts` only after constructing a resolver. If `AGNES_TRUSTED_CONTEXT_HEADERS !== 'true'`, throw `AGNES request context resolver is not configured`; do not silently trust headers.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- tests/unit/kidsworld-permissions.test.ts tests/transport/kidsworld-routes.test.ts tests/unit/build-app.test.ts
npm run build
git add src/kidsworld/kidsworld-capabilities.ts src/transport/request-context.ts src/transport/kidsworld-routes.ts src/app/build-app.ts src/app/server.ts tests/unit/kidsworld-permissions.test.ts tests/transport/kidsworld-routes.test.ts tests/unit/build-app.test.ts
git commit -m "feat: expose authorized KidsWorld API"
```

---

### Task 6: React/Vite Scaffold, API Client, and Production Static Delivery

**Files:**
- Create: `web/package.json`
- Create: `web/package-lock.json`
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
- Modify: `src/app/server.ts`
- Test: `web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: Task 5 HTTP API.
- Produces: testable React client plus Fastify production serving of `web/dist`.

- [ ] **Step 1: Scaffold dependencies and scripts**

Run:

```bash
mkdir -p web
cd web
npm init -y
npm install react react-dom react-router-dom
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
cd ..
npm install @fastify/static
```

Set web scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Set root scripts:

```json
{
  "web:dev": "npm --prefix web run dev",
  "web:build": "npm --prefix web run build",
  "web:test": "npm --prefix web test",
  "check:all": "npm run check && npm run web:build && npm run web:test"
}
```

- [ ] **Step 2: Write RED web smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders KidsWorld entry route', () => {
  render(<App initialEntries={['/kids']} />);
  expect(screen.getByRole('heading', { name: /KidsWorld/i })).toBeInTheDocument();
});
```

Run: `npm --prefix web test -- src/app/App.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement router and typed fetch wrapper**

```ts
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...trustedLocalHeaders(), ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new KidsWorldApiError(response.status, body.message ?? 'Request failed');
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}
```

`trustedLocalHeaders()` reads only `VITE_AGNES_HOUSEHOLD_ID` and `VITE_AGNES_ACTOR_PERSON_ID`; if absent, returns `{}`. Export API methods for list children, dashboard, content, mission completion, learning, routine, reward request, parent summary, and reward approval.

- [ ] **Step 4: Implement visual tokens and reduced motion**

```css
:root {
  --kw-bg: #201943;
  --kw-surface: #342a63;
  --kw-purple: #8e72db;
  --kw-blue: #62a7ff;
  --kw-mint: #69d5ba;
  --kw-gold: #f7c857;
  --kw-radius: 24px;
  --kw-touch: 44px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Serve production build through Fastify**

```ts
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';

await app.register(fastifyStatic, {
  root: resolve(process.cwd(), 'web/dist'),
  prefix: '/',
  wildcard: false,
});
app.get('/kids/*', async (_request, reply) => reply.sendFile('index.html'));
app.get('/kids', async (_request, reply) => reply.sendFile('index.html'));
```

Register API routes before SPA fallback. In development, Vite remains separate via `npm run web:dev` and proxies `/api` to Fastify in `vite.config.ts`.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm --prefix web test -- src/app/App.test.tsx
npm --prefix web run build
npm run build
git add web package.json package-lock.json src/app/server.ts
git commit -m "feat: scaffold and serve KidsWorld web client"
```

---

### Task 7: Profile Chooser, Kids Home, My Day, and Rewards UI

**Files:**
- Create: `web/src/components/KidsWorldShell.tsx`
- Create: `web/src/components/ChildProfileCard.tsx`
- Create: `web/src/components/StarMeter.tsx`
- Create: `web/src/components/CompanionPrompt.tsx`
- Create: `web/src/components/FeatureCard.tsx`
- Create: `web/src/components/AsyncState.tsx`
- Create: `web/src/pages/ProfileChooserPage.tsx`
- Create: `web/src/pages/KidsHomePage.tsx`
- Create: `web/src/pages/MyDayPage.tsx`
- Create: `web/src/pages/RewardsPage.tsx`
- Modify: `web/src/app/router.tsx`
- Test: `web/src/pages/KidsCorePages.test.tsx`

**Interfaces:**
- Consumes: list children/dashboard/mission/reward API methods.
- Produces: `/kids`, `/kids/:personId`, `/today`, `/rewards` functional routes.

- [ ] **Step 1: Write RED interactions**

```tsx
it('routes by personId, not display name', async () => {
  api.listChildren.mockResolvedValue({ children: [child] });
  renderKids('/kids');
  await user.click(await screen.findByRole('button', { name: /Vasilis World/i }));
  expect(window.location.pathname).toBe(`/kids/${child.personId}`);
});

it('shows permanent star change only after mission server success', async () => {
  api.getDashboard.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
  api.completeMission.mockResolvedValue({ awardedStars: 10, alreadyCompleted: false });
  renderKids(`/kids/${child.personId}/today`);
  await user.click(await screen.findByRole('button', { name: /5 λεπτά ανάγνωση/i }));
  expect(api.completeMission).toHaveBeenCalled();
  expect(await screen.findByText('110')).toBeInTheDocument();
});

it('shows pending reward approval', async () => {
  api.requestReward.mockResolvedValue({ requestId: 'r1', status: 'pending' });
  renderKids(`/kids/${child.personId}/rewards`);
  await user.click(await screen.findByRole('button', { name: /Movie Night/i }));
  expect(await screen.findByText(/Περιμένει έγκριση/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement shared shell/navigation**

```tsx
export function KidsWorldShell({ child, children }: Props) {
  return (
    <div className="kw-shell">
      <header><Link to="/kids" aria-label="KidsWorld αρχική">KIDSWORLD</Link><StarMeter value={child.starsBalance} /></header>
      <main>{children}</main>
      <nav aria-label="KidsWorld">
        <NavLink to={`/kids/${child.personId}`}>Αρχική</NavLink>
        <NavLink to={`/kids/${child.personId}/today`}>Σήμερα</NavLink>
        <NavLink to={`/kids/${child.personId}/school`}>Σχολείο</NavLink>
        <NavLink to={`/kids/${child.personId}/rewards`}>Rewards</NavLink>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Implement chooser/home without screenshot hit-maps**

```tsx
const features = [
  ['today','Σήμερα'], ['school','Σχολείο'], ['explore','Εξερεύνηση'], ['stories','Ιστορίες'],
  ['games','Παιχνίδια'], ['create','Δημιουργία'], ['rewards','Ανταμοιβές'], ['bedtime','Ώρα Ύπνου'],
] as const;

return <section className="feature-grid">{features.map(([path,label]) => (
  <FeatureCard key={path} as={Link} to={`/kids/${personId}/${path}`} label={label} />
))}</section>;
```

`AsyncState` uses exact messages: loading `Φορτώνουμε το KidsWorld…`, empty `Δεν υπάρχει ακόμη παιδικό προφίλ στο KidsWorld.`, error `Δεν μπορέσαμε να φορτώσουμε το KidsWorld. Δοκίμασε ξανά.`

- [ ] **Step 4: Implement My Day and Rewards mutation states**

```tsx
async function onComplete(missionId: string) {
  setBusyMission(missionId);
  try {
    await api.completeMission(personId, missionId);
    setDashboard(await api.getDashboard(personId, localDate));
  } finally {
    setBusyMission(null);
  }
}
```

Render server timeline order unchanged. Keep previous dashboard in component state if refresh fails and show `Τα στοιχεία μπορεί να είναι παλιά.`. Reward request buttons disable while pending and display server-returned request status.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm --prefix web test -- src/pages/KidsCorePages.test.tsx
npm --prefix web run build
git add web/src/components web/src/pages/ProfileChooserPage.tsx web/src/pages/KidsHomePage.tsx web/src/pages/MyDayPage.tsx web/src/pages/RewardsPage.tsx web/src/pages/KidsCorePages.test.tsx web/src/app/router.tsx
git commit -m "feat: add KidsWorld core child experience"
```

---

### Task 8: School, Explorer, Stories, Games, Create Studio, and Bedtime

**Files:**
- Create: `web/src/components/CatalogWorldPage.tsx`
- Create: `web/src/pages/SchoolWorldPage.tsx`
- Create: `web/src/pages/ExplorerWorldPage.tsx`
- Create: `web/src/pages/StoriesPage.tsx`
- Create: `web/src/pages/GamesPage.tsx`
- Create: `web/src/pages/CreateStudioPage.tsx`
- Create: `web/src/pages/BedtimePage.tsx`
- Modify: `web/src/app/router.tsx`
- Test: `web/src/pages/FeatureWorlds.test.tsx`

**Interfaces:**
- Consumes: curated content endpoint and learning/mission/routine mutations.
- Produces: every remaining required child-facing route.

- [ ] **Step 1: Write RED route/data test**

```tsx
it.each([
  ['school', 'Maths Lab'],
  ['explore', 'London Mission'],
  ['stories', 'Ηρακλής'],
  ['games', 'Math Racer'],
  ['create', 'Ζωγραφίζω'],
  ['bedtime', 'Ο μικρός δράκος και το φεγγάρι'],
])('renders %s from API content', async (route, text) => {
  api.getContent.mockResolvedValue(content[route]);
  renderKids(`/kids/${childId}/${route}`);
  expect(await screen.findByText(text)).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement reusable catalog renderer**

```tsx
export function CatalogWorldPage({ feature, title, onComplete }: Props) {
  const { items, state } = useKidsWorldContent(feature);
  return (
    <section>
      <h1>{title}</h1>
      <AsyncState state={state} />
      <div className="feature-grid">
        {items.map((item) => <FeatureCard key={item.id} label={item.title} subtitle={item.subtitle} onActivate={() => onComplete?.(item)} />)}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Implement School/Explorer/Games completion rules**

```tsx
export function SchoolWorldPage() {
  return <CatalogWorldPage feature="school" title="School World" onComplete={async (item) => {
    await api.recordLearning(personId, { sessionId: crypto.randomUUID(), subject: item.skillTags[0], durationMinutes: 10, correlationId: `content:${item.id}:${Date.now()}` });
  }} />;
}
```

Explorer/Games call `completeMission` only when their content item is associated with a persisted mission ID returned by dashboard/content DTO. Opening an item never awards stars.

- [ ] **Step 4: Implement Story/Create/Bedtime bounded experiences**

```tsx
export function StoriesPage() {
  const story = useFeatureItem('stories', 'hercules-first-labor');
  const [choice, setChoice] = useState<string | null>(null);
  return <section><h1>{story.title}</h1>{story.payload.choices.map((x) => <button key={x} onClick={() => setChoice(x)}>{x}</button>)}{choice && <p>Επέλεξες: {choice}</p>}</section>;
}

export function CreateStudioPage() {
  return <CatalogWorldPage feature="create" title="Δημιουργία" onComplete={(item) => setSelectedMode(item.id)} />;
}

export function BedtimePage() {
  return <CatalogWorldPage feature="bedtime" title="Ώρα Ύπνου" onComplete={async (item) => {
    const stepKey = String(item.payload.routineStep ?? item.id);
    await api.completeRoutine(personId, 'bedtime', stepKey, localDate);
  }} />;
}
```

No model/API generation calls are allowed in these pages for v1.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm --prefix web test -- src/pages/FeatureWorlds.test.tsx
npm --prefix web run build
git add web/src/components/CatalogWorldPage.tsx web/src/pages/SchoolWorldPage.tsx web/src/pages/ExplorerWorldPage.tsx web/src/pages/StoriesPage.tsx web/src/pages/GamesPage.tsx web/src/pages/CreateStudioPage.tsx web/src/pages/BedtimePage.tsx web/src/pages/FeatureWorlds.test.tsx web/src/app/router.tsx
git commit -m "feat: add KidsWorld feature worlds"
```

---

### Task 9: Parent Summary, Responsive Layout, and Accessibility

**Files:**
- Create: `web/src/pages/ParentSummaryPage.tsx`
- Modify: `web/src/components/KidsWorldShell.tsx`
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/styles/global.css`
- Test: `web/src/pages/ParentSummaryPage.test.tsx`
- Modify: `web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: parent summary/approval API.
- Produces: parent-only UI and monitor/tablet/mobile/accessibility regression coverage.

- [ ] **Step 1: Write RED parent and accessibility tests**

```tsx
it('approves a pending reward from parent summary', async () => {
  api.getParentSummary.mockResolvedValue(summary);
  api.approveReward.mockResolvedValue({ requestId: 'r1', status: 'approved' });
  renderKids('/kids/parent');
  await user.click(await screen.findByRole('button', { name: /Έγκριση Movie Night/i }));
  expect(api.approveReward).toHaveBeenCalledWith('r1');
});

it('uses semantic navigation and one h1', async () => {
  renderKids(`/kids/${childId}`);
  expect(await screen.findByRole('navigation', { name: /KidsWorld/i })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  for (const button of screen.getAllByRole('button')) expect(button).toHaveAccessibleName();
});
```

- [ ] **Step 2: Implement concise parent page**

```tsx
export function ParentSummaryPage() {
  const summary = useParentSummary();
  return <main><h1>KidsWorld — Γονείς</h1>{summary.children.map((child) => (
    <article key={child.personId}>
      <h2>{child.displayName}</h2>
      <p>{child.completedMissions}/{child.completedMissions + child.remainingMissions} αποστολές</p>
      <p>{child.learningMinutes} λεπτά μάθησης</p>
      <p>⭐ +{child.starsEarned} / -{child.starsSpent}</p>
      <ul>{child.milestones.map((x) => <li key={x}>{x}</li>)}</ul>
      <ul>{child.tomorrowPreparation.map((x) => <li key={x}>{x}</li>)}</ul>
      {child.rewardRequests.map((r) => <button key={r.id} onClick={() => approve(r.id)}>Έγκριση {r.rewardName}</button>)}
    </article>
  ))}</main>;
}
```

- [ ] **Step 3: Add exact responsive bands and focus behavior**

```css
button, a { min-width: var(--kw-touch); min-height: var(--kw-touch); }
button:focus-visible, a:focus-visible { outline: 3px solid var(--kw-gold); outline-offset: 3px; }

@media (max-width: 719px) {
  .feature-grid { grid-template-columns: 1fr; }
  .kw-shell nav { position: sticky; bottom: 0; }
}
@media (min-width: 720px) and (max-width: 1199px) {
  .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1200px) {
  .feature-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .kw-shell { max-width: 1600px; margin: 0 auto; }
}
```

No clickable bare `<div>` elements; activation uses button/link semantics.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm --prefix web test -- src/pages/ParentSummaryPage.test.tsx src/app/App.test.tsx
npm --prefix web run build
git add web/src/pages/ParentSummaryPage.tsx web/src/pages/ParentSummaryPage.test.tsx web/src/components/KidsWorldShell.tsx web/src/styles web/src/app/App.test.tsx
git commit -m "feat: finish KidsWorld parent and responsive UX"
```

---

### Task 10: Deterministic Development Seed and Full End-to-End Slice

**Files:**
- Create: `src/kidsworld/dev-seed.ts`
- Create: `tests/e2e/kidsworld-vertical-slice.test.ts`

**Interfaces:**
- Consumes: all backend/domain services.
- Produces: repeatable demo data and a complete persisted KidsWorld flow.

- [ ] **Step 1: Define deterministic seed contract**

```ts
export interface KidsWorldSeedResult {
  householdId: HouseholdId;
  parentPersonId: PersonId;
  childPersonIds: readonly PersonId[];
}

export async function seedKidsWorldDevelopmentData(deps: SeedDeps): Promise<KidsWorldSeedResult> {
  const household = createHousehold({ name: 'AGNES Home', timezone: 'Asia/Nicosia', locale: 'el-CY' });
  const parent = createPerson({ householdId: household.id, displayName: 'Parent', role: 'parent', locale: 'el-CY', timezone: 'Asia/Nicosia', permissionsProfileId: 'kids-parent-v1' });
  const childA = createPerson({ householdId: household.id, displayName: 'Vasilis', role: 'child', locale: 'el-CY', timezone: 'Asia/Nicosia', permissionsProfileId: 'kids-child-v1' });
  const childB = createPerson({ householdId: household.id, displayName: 'Elenios', role: 'child', locale: 'el-CY', timezone: 'Asia/Nicosia', permissionsProfileId: 'kids-child-v1' });
  await deps.households.saveHousehold(household);
  await deps.households.savePerson(parent);
  await deps.households.savePerson(childA);
  await deps.households.savePerson(childB);
  await deps.kids.saveProfile(createKidsWorldProfile({ householdId: household.id, personId: childA.id, avatarKey: 'blue' }));
  await deps.kids.saveProfile(createKidsWorldProfile({ householdId: household.id, personId: childB.id, avatarKey: 'mint' }));
  return { householdId: household.id, parentPersonId: parent.id, childPersonIds: [childA.id, childB.id] };
}
```

After this base, seed one calendar event, one available mission per feature, and Movie Night/Choose Dinner/Special Gift rewards through repository APIs.

- [ ] **Step 2: Write E2E test with exact persisted assertions**

```ts
it('runs dashboard -> mission -> learning -> bedtime -> parent summary', async () => {
  const seed = await seedKidsWorldDevelopmentData(deps);
  const childId = seed.childPersonIds[0]!;
  const dashboard = await services.getDashboard({ householdId: seed.householdId, personId: childId, localDate: '2026-09-01' });
  const mission = dashboard.missions[0]!;

  const first = await services.completeMission({ householdId: seed.householdId, personId: childId, missionId: mission.id });
  const retry = await services.completeMission({ householdId: seed.householdId, personId: childId, missionId: mission.id });
  expect(first.awardedStars).toBe(mission.rewardStars);
  expect(retry.awardedStars).toBe(0);

  await services.recordLearningSession({ householdId: seed.householdId, personId: childId, sessionId: newLearningSessionId(), subject: 'english', durationMinutes: 10, correlationId: 'e2e:english:1' });
  await services.completeRoutineStep({ householdId: seed.householdId, personId: childId, routine: 'bedtime', stepKey: 'story', localDate: '2026-09-01' });

  const parent = await services.getParentSummary({ householdId: seed.householdId, actorPersonId: seed.parentPersonId, localDate: '2026-09-01' });
  expect(parent.children.find((x) => x.personId === childId)).toMatchObject({ completedMissions: 1, learningMinutes: 10 });

  const ledger = await pool.query('select amount from kidsworld_star_ledger where person_id=$1 and correlation_id=$2', [childId, `mission:${mission.id}`]);
  const event = await pool.query("select event_type from outbox_events where correlation_id=$1 and event_type='kidsworld.mission.completed.v1'", [`kidsworld:mission:${mission.id}`]);
  expect(ledger.rowCount).toBe(1);
  expect(event.rowCount).toBe(1);
});
```

- [ ] **Step 3: Run GREEN and commit**

```bash
npm test -- tests/e2e/kidsworld-vertical-slice.test.ts
git add src/kidsworld/dev-seed.ts tests/e2e/kidsworld-vertical-slice.test.ts
git commit -m "test: add KidsWorld vertical slice"
```

---

### Task 11: CI, Operations, and Final Regression Gate

**Files:**
- Modify: `.github/workflows/core-ci.yml`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete implementation.
- Produces: reproducible local/CI verification and explicit local-only identity-header documentation.

- [ ] **Step 1: Extend CI exactly**

After root `npm ci`, add:

```yaml
- name: Install web dependencies
  run: npm ci --prefix web

- name: Apply KidsWorld migration
  run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_kidsworld.sql

- name: Web tests
  run: npm --prefix web test

- name: Web production build
  run: npm --prefix web run build

- name: KidsWorld E2E
  run: npm test -- tests/e2e/kidsworld-vertical-slice.test.ts
```

Keep existing Core migration, lint, build, unit/integration, calendar E2E, and formatting steps.

- [ ] **Step 2: Document environment and local run contract**

Add to `.env.example`:

```text
AGNES_TRUSTED_CONTEXT_HEADERS=false
```

README commands:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_kidsworld.sql
npm run web:build
npm run check:all
```

State explicitly: trusted identity headers are for controlled local/demo use, not production authentication.

- [ ] **Step 3: Run the complete verification gate**

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

- [ ] **Step 4: Verify acceptance criteria against persisted behavior**

Run targeted negative checks:

```bash
npm test -- tests/unit/kidsworld-permissions.test.ts
npm test -- tests/integration/kidsworld-transactions.test.ts
npm --prefix web test -- src/pages/KidsCorePages.test.tsx src/pages/FeatureWorlds.test.tsx src/pages/ParentSummaryPage.test.tsx
```

Expected: cross-household/sibling/parent authorization tests pass, duplicate award tests pass, every required route renders from API data, and no test relies on a static screenshot.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/core-ci.yml .env.example README.md
git commit -m "ci: verify KidsWorld v1"
```

---

## Final Acceptance Checklist

- [ ] Profile chooser is API-driven and routes by canonical `PersonId`.
- [ ] Home, My Day, School, Explorer, Stories, Games, Create, Rewards, Bedtime, and Parent Summary are real routes/components.
- [ ] My Day merges canonical child calendar events with persisted missions/routines using the child's timezone.
- [ ] Mission retry/concurrency yields exactly one star ledger award.
- [ ] Learning/routine progress survives process restart because it is PostgreSQL-backed.
- [ ] Reward requests persist; approval deducts stars exactly once and is parent-authorized.
- [ ] Parent Summary reads persisted child actions and derives milestones deterministically.
- [ ] Child access to sibling, parent, or another household is rejected server-side.
- [ ] Optional content is curated/local in v1 and does not invoke unrestricted child AI.
- [ ] Fastify serves the production React bundle and SPA route fallback without intercepting `/api`.
- [ ] UI has explicit loading/error/stale/empty states, keyboard focus, >=44px touch targets, and reduced-motion behavior.
- [ ] Monitor, tablet, and mobile layouts use the same components.
- [ ] Core tests, Core calendar E2E, KidsWorld unit/integration/E2E, web tests, web production build, lint, TypeScript build, and formatting all pass.
