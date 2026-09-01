# AGNES Kids Education Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready backend slice for AGNES Kids Education so Vasilis (Γ΄ Δημοτικού) and Elenios (Α΄ Δημοτικού) can use the approved 3D open-book client with curriculum browsing, interactive page state, validation, rewards, resume, and puppy break coaching.

**Architecture:** Add an isolated `src/education` domain with rendering-agnostic models and services, a PostgreSQL repository behind an `EducationRepository` contract, and Fastify routes under `/education`. Official/source content metadata stays immutable; learner state is versioned independently and stored as JSON-compatible interaction overlays. The 3D client consumes these stable APIs later without coupling domain code to any rendering library.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, PostgreSQL/pg 8, Zod 4, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-01-agnes-kids-education-design.md`

## Global Constraints

- Vasilis maps to grade `C` (Γ΄ Δημοτικού); Elenios maps to grade `A` (Α΄ Δημοτικού).
- Preserve the approved 3D open-book client contract; backend/domain code must not depend on a rendering library.
- Base curriculum/source assets are immutable; learner annotations and answers are stored separately.
- Autosave uses optimistic version checking and must return a conflict instead of silently overwriting newer learner work.
- Break coach never interrupts an in-progress activity.
- Rewards are issued only for valid completion, never for random attempts.
- Child-facing feedback is short and simple; API responses remain structured data.
- Official/source metadata includes attribution, source URL, resource version/date when available, and usage type.

---

### Task 1: Education core types and learner profiles

**Files:**
- Create: `src/education/types.ts`
- Create: `src/education/learner-profile.ts`
- Test: `tests/unit/education-learner-profile.test.ts`

**Interfaces:**
- Produces: `Grade`, `LearnerId`, `ActivityKind`, `ValidationMode`, `LearnerProfile`, `getLearnerProfile(learnerId)`.

- [ ] **Step 1: Write the failing learner mapping test**

```ts
import { describe, expect, it } from 'vitest';
import { getLearnerProfile } from '../../src/education/learner-profile.js';

describe('education learner profiles', () => {
  it('maps Vasilis to Γ΄ and Elenios to Α΄', () => {
    expect(getLearnerProfile('vasilis').grade).toBe('C');
    expect(getLearnerProfile('elenios').grade).toBe('A');
  });

  it('rejects an unknown learner', () => {
    expect(() => getLearnerProfile('unknown')).toThrow('Unknown learner');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/unit/education-learner-profile.test.ts`
Expected: FAIL because `src/education/learner-profile.ts` does not exist.

- [ ] **Step 3: Implement the minimal types and learner mapping**

```ts
// src/education/types.ts
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'ST';
export type LearnerId = 'vasilis' | 'elenios';
export type ActivityKind =
  | 'handwriting'
  | 'typed-text'
  | 'single-choice'
  | 'multiple-choice'
  | 'drag-drop'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'drawing'
  | 'read-aloud';
export type ValidationMode = 'manual' | 'exact' | 'rule-based' | 'guided';

export interface LearnerProfile {
  readonly learnerId: LearnerId;
  readonly displayName: string;
  readonly grade: Grade;
}
```

```ts
// src/education/learner-profile.ts
import type { LearnerId, LearnerProfile } from './types.js';

const profiles: Record<LearnerId, LearnerProfile> = {
  vasilis: { learnerId: 'vasilis', displayName: 'Βασίλης', grade: 'C' },
  elenios: { learnerId: 'elenios', displayName: 'Ελένιος', grade: 'A' },
};

export function getLearnerProfile(learnerId: string): LearnerProfile {
  const profile = profiles[learnerId as LearnerId];
  if (!profile) throw new Error(`Unknown learner: ${learnerId}`);
  return profile;
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- tests/unit/education-learner-profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/education/types.ts src/education/learner-profile.ts tests/unit/education-learner-profile.test.ts
git commit -m "feat: add education learner profiles"
```

---

### Task 2: Curriculum hierarchy and grade-filtered seed catalog

**Files:**
- Create: `src/education/curriculum.ts`
- Create: `src/education/seed-catalog.ts`
- Test: `tests/unit/education-curriculum.test.ts`

**Interfaces:**
- Consumes: `Grade`, `ActivityKind`, `ValidationMode` from Task 1.
- Produces: `CurriculumResource`, `CurriculumPage`, `ActivityDefinition`, `getCatalogForGrade(grade)`, `getPage(resourceId, pageId)`.

- [ ] **Step 1: Write a failing catalog filtering test**

```ts
import { describe, expect, it } from 'vitest';
import { getCatalogForGrade } from '../../src/education/seed-catalog.js';

describe('education curriculum catalog', () => {
  it('returns only Γ΄ resources for grade C', () => {
    const resources = getCatalogForGrade('C');
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.grade === 'C')).toBe(true);
  });

  it('returns only Α΄ resources for grade A', () => {
    const resources = getCatalogForGrade('A');
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.grade === 'A')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/unit/education-curriculum.test.ts`
Expected: FAIL because the catalog modules do not exist.

- [ ] **Step 3: Implement curriculum models**

```ts
// src/education/curriculum.ts
import type { ActivityKind, Grade, ValidationMode } from './types.js';

export interface SourceMetadata {
  readonly attribution: string;
  readonly sourceUrl: string;
  readonly resourceVersion?: string;
  readonly resourceDate?: string;
  readonly usageType: 'official-link' | 'official-embed' | 'agnes-authored';
}

export interface ActivityDefinition {
  readonly activityId: string;
  readonly kind: ActivityKind;
  readonly validationMode: ValidationMode;
  readonly prompt: string;
  readonly expected?: unknown;
}

export interface CurriculumPage {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly title: string;
  readonly baseContent: { readonly type: 'source' | 'agnes'; readonly ref: string };
  readonly activities: readonly ActivityDefinition[];
}

export interface CurriculumResource {
  readonly resourceId: string;
  readonly grade: Grade;
  readonly subjectId: string;
  readonly subjectLabel: string;
  readonly title: string;
  readonly source: SourceMetadata;
  readonly pages: readonly CurriculumPage[];
}
```

- [ ] **Step 4: Add a small rights-safe seed catalog for grades A and C**

Use official-source metadata plus AGNES-authored sample interactive pages aligned to the curriculum; do not duplicate protected book pages.

```ts
// src/education/seed-catalog.ts
import type { CurriculumResource } from './curriculum.js';
import type { Grade } from './types.js';

export const seedCatalog: readonly CurriculumResource[] = [
  {
    resourceId: 'math-c-01', grade: 'C', subjectId: 'math', subjectLabel: 'Μαθηματικά',
    title: 'Μαθηματικά Γ΄ Δημοτικού',
    source: { attribution: 'ΥΠΑΝ Κύπρου — Μαθηματικά Δημοτικής Εκπαίδευσης', sourceUrl: 'https://mathd.schools.ac.cy/el/', usageType: 'official-link' },
    pages: [{ pageId: 'math-c-01-p1', pageNumber: 1, title: 'Πρόσθεση και αφαίρεση', baseContent: { type: 'agnes', ref: 'agnes://math-c-01-p1' }, activities: [{ activityId: 'math-c-01-a1', kind: 'numeric', validationMode: 'exact', prompt: '24 + 13 =', expected: 37 }] }],
  },
  {
    resourceId: 'math-a-01', grade: 'A', subjectId: 'math', subjectLabel: 'Μαθηματικά',
    title: 'Μαθηματικά Α΄ Δημοτικού',
    source: { attribution: 'ΥΠΑΝ Κύπρου — Μαθηματικά Δημοτικής Εκπαίδευσης', sourceUrl: 'https://mathd.schools.ac.cy/el/', usageType: 'official-link' },
    pages: [{ pageId: 'math-a-01-p1', pageNumber: 1, title: 'Μετρώ αντικείμενα', baseContent: { type: 'agnes', ref: 'agnes://math-a-01-p1' }, activities: [{ activityId: 'math-a-01-a1', kind: 'single-choice', validationMode: 'exact', prompt: 'Πόσα αντικείμενα βλέπεις;', expected: '3' }] }],
  },
];

export function getCatalogForGrade(grade: Grade): readonly CurriculumResource[] {
  return seedCatalog.filter((resource) => resource.grade === grade);
}

export function getPage(resourceId: string, pageId: string) {
  return seedCatalog.find((resource) => resource.resourceId === resourceId)?.pages.find((page) => page.pageId === pageId);
}
```

- [ ] **Step 5: Run the focused test and commit**

Run: `npm test -- tests/unit/education-curriculum.test.ts`
Expected: PASS.

```bash
git add src/education/curriculum.ts src/education/seed-catalog.ts tests/unit/education-curriculum.test.ts
git commit -m "feat: add education curriculum catalog"
```

---

### Task 3: Learner interaction overlay, reset, and activity validation

**Files:**
- Create: `src/education/interaction.ts`
- Create: `src/education/activity-checker.ts`
- Test: `tests/unit/education-interaction.test.ts`
- Test: `tests/unit/education-activity-checker.test.ts`

**Interfaces:**
- Consumes: `ActivityDefinition` from Task 2.
- Produces: `PageInteractionState`, `createEmptyPageState`, `clearLearnerLayer`, `checkActivity`.

- [ ] **Step 1: Write failing serialization/reset tests**

```ts
import { describe, expect, it } from 'vitest';
import { clearLearnerLayer, createEmptyPageState } from '../../src/education/interaction.js';

it('clears learner work without changing page identity/version basis', () => {
  const state = { ...createEmptyPageState('vasilis', 'math-c-01-p1'), typedAnswers: { a1: '37' }, version: 4 };
  const cleared = clearLearnerLayer(state);
  expect(cleared.pageId).toBe('math-c-01-p1');
  expect(cleared.typedAnswers).toEqual({});
  expect(cleared.version).toBe(4);
});
```

- [ ] **Step 2: Write failing exact-validation tests**

```ts
import { expect, it } from 'vitest';
import { checkActivity } from '../../src/education/activity-checker.js';

it('checks exact numeric answers', () => {
  const result = checkActivity({ activityId: 'a1', kind: 'numeric', validationMode: 'exact', prompt: '24 + 13 =', expected: 37 }, 37);
  expect(result).toEqual({ status: 'correct' });
});
```

- [ ] **Step 3: Implement overlay state and checker**

`PageInteractionState` must include normalized-coordinate strokes, typed answers, selections, drag/drop state, matching state, ordering state, attempts/results, completion flags, current activity, `inProgress`, `version`, and timestamps. `clearLearnerLayer` returns a copy with learner-created collections emptied but keeps learner/page identity and the current optimistic version.

`checkActivity` behavior:
- `manual` => `{ status: 'manual' }`
- `guided` => `{ status: 'guided' }`
- `exact` => compare normalized primitives/arrays
- `rule-based` => initially normalize trimmed case-insensitive strings and numeric values

- [ ] **Step 4: Run both focused tests**

Run: `npm test -- tests/unit/education-interaction.test.ts tests/unit/education-activity-checker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/education/interaction.ts src/education/activity-checker.ts tests/unit/education-interaction.test.ts tests/unit/education-activity-checker.test.ts
git commit -m "feat: add education interaction state and validation"
```

---

### Task 4: Progress, rewards, resume, and puppy break-coach policy

**Files:**
- Create: `src/education/progress.ts`
- Create: `src/education/lesson-session.ts`
- Create: `src/education/break-coach.ts`
- Test: `tests/unit/education-progress.test.ts`
- Test: `tests/unit/education-break-coach.test.ts`

**Interfaces:**
- Produces: `completeActivity(progress, result)`, `ResumeState`, `evaluateBreak(session, policy)`.

- [ ] **Step 1: Write a failing reward test**

```ts
import { expect, it } from 'vitest';
import { completeActivity } from '../../src/education/progress.js';

it('awards one star only for first valid completion', () => {
  const initial = { stars: 0, completedActivityIds: [] as string[] };
  const once = completeActivity(initial, 'a1', { status: 'correct' });
  const twice = completeActivity(once, 'a1', { status: 'correct' });
  expect(once.stars).toBe(1);
  expect(twice.stars).toBe(1);
});
```

- [ ] **Step 2: Write failing break-coach tests**

```ts
import { expect, it } from 'vitest';
import { evaluateBreak } from '../../src/education/break-coach.js';

it('defers a due break while an activity is in progress', () => {
  expect(evaluateBreak({ uninterruptedMinutes: 25, completedActivities: 4, activityInProgress: true }, { minutesThreshold: 20, activityThreshold: 3 })).toEqual({ action: 'defer' });
});

it('suggests a break at an activity boundary after threshold', () => {
  expect(evaluateBreak({ uninterruptedMinutes: 25, completedActivities: 4, activityInProgress: false }, { minutesThreshold: 20, activityThreshold: 3 }).action).toBe('suggest');
});
```

- [ ] **Step 3: Implement progress and break policy**

Default break policy for the initial slice: `minutesThreshold: 20`, `activityThreshold: 3`, `breakMinutes: 5`. A break becomes due if either study threshold is reached; it returns `defer` while an activity is active and `suggest` at a safe boundary. Suggested actions rotate deterministically from `water`, `stretch`, `eyes`, `movement`, `breathing` using completed-activity count modulo the list length.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/unit/education-progress.test.ts tests/unit/education-break-coach.test.ts`
Expected: PASS.

```bash
git add src/education/progress.ts src/education/lesson-session.ts src/education/break-coach.ts tests/unit/education-progress.test.ts tests/unit/education-break-coach.test.ts
git commit -m "feat: add education progress and break coach"
```

---

### Task 5: Education repository contract and PostgreSQL persistence

**Files:**
- Create: `src/education/education-repository.ts`
- Create: `src/persistence/postgres-education-repository.ts`
- Create: `src/persistence/migrations/002_education.sql`
- Test: `tests/integration/postgres-education-repository.test.ts`

**Interfaces:**
- Produces: `EducationRepository`, `PostgresEducationRepository` with `getPageState`, `savePageState`, `getResumeState`, `saveResumeState`, `getProgress`, `saveProgress`.

- [ ] **Step 1: Define the repository contract**

```ts
export interface SavePageStateResult {
  readonly state: PageInteractionState;
}

export class EducationVersionConflictError extends Error {}

export interface EducationRepository {
  getPageState(learnerId: LearnerId, pageId: string): Promise<PageInteractionState | null>;
  savePageState(state: PageInteractionState, expectedVersion: number): Promise<SavePageStateResult>;
  getResumeState(learnerId: LearnerId): Promise<ResumeState | null>;
  saveResumeState(state: ResumeState): Promise<void>;
  getProgress(learnerId: LearnerId): Promise<LearnerProgress>;
  saveProgress(learnerId: LearnerId, progress: LearnerProgress): Promise<void>;
}
```

- [ ] **Step 2: Write an integration test for optimistic conflict**

The test creates state at version 0, saves it with expected version 0, verifies persisted version 1, then attempts a second save with stale expected version 0 and expects `EducationVersionConflictError`.

Run: `npm test -- tests/integration/postgres-education-repository.test.ts`
Expected: FAIL before the migration/repository exists.

- [ ] **Step 3: Add database schema**

```sql
CREATE TABLE IF NOT EXISTS education_page_state (
  learner_id text NOT NULL,
  page_id text NOT NULL,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, page_id)
);

CREATE TABLE IF NOT EXISTS education_resume (
  learner_id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS education_progress (
  learner_id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Implement PostgreSQL optimistic save**

Use `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE education_page_state.version = $expectedVersion RETURNING ...`. If no row is returned, query whether the row exists; throw `EducationVersionConflictError` when it exists with a newer version.

- [ ] **Step 5: Run the integration test and commit**

Run: `npm test -- tests/integration/postgres-education-repository.test.ts`
Expected: PASS with test database configured.

```bash
git add src/education/education-repository.ts src/persistence/postgres-education-repository.ts src/persistence/migrations/002_education.sql tests/integration/postgres-education-repository.test.ts
git commit -m "feat: persist education learner state"
```

---

### Task 6: Education application service

**Files:**
- Create: `src/education/education-service.ts`
- Test: `tests/unit/education-service.test.ts`

**Interfaces:**
- Consumes: learner profile, seed catalog, interaction checker, progress, break coach, `EducationRepository`.
- Produces: `EducationService` methods matching the API use cases.

- [ ] **Step 1: Write failing service tests for grade protection and resume**

```ts
it('rejects a Γ΄ resource for Elenios', async () => {
  await expect(service.getPage('elenios', 'math-c-01', 'math-c-01-p1')).rejects.toThrow('Grade mismatch');
});

it('returns Vasilis resume state after saving page work', async () => {
  await service.savePageState('vasilis', 'math-c-01-p1', state, 0);
  expect((await service.getResume('vasilis'))?.pageId).toBe('math-c-01-p1');
});
```

- [ ] **Step 2: Implement service methods**

Required methods:

```ts
getLearner(learnerId: string): LearnerProfile;
getCatalog(learnerId: string): readonly CurriculumResource[];
getPage(learnerId: string, resourceId: string, pageId: string): Promise<CurriculumPage>;
getResume(learnerId: string): Promise<ResumeState | null>;
savePageState(learnerId: string, pageId: string, state: PageInteractionState, expectedVersion: number): Promise<PageInteractionState>;
checkActivity(learnerId: string, activityId: string, answer: unknown): Promise<ActivityCheckResult>;
evaluateBreak(learnerId: string, input: BreakSessionInput): Promise<BreakEvaluation>;
```

`savePageState` verifies learner identity, updates resume atomically at the service level after successful page-state persistence, and never mutates catalog base content.

- [ ] **Step 3: Run service tests and commit**

Run: `npm test -- tests/unit/education-service.test.ts`
Expected: PASS.

```bash
git add src/education/education-service.ts tests/unit/education-service.test.ts
git commit -m "feat: add education application service"
```

---

### Task 7: Fastify education routes and schema validation

**Files:**
- Create: `src/transport/education-routes.ts`
- Modify: `src/app/server.ts`
- Modify: `src/app/build-app.ts`
- Test: `tests/unit/education-routes.test.ts`
- Test: `tests/unit/build-app.test.ts`

**Interfaces:**
- Produces the initial API surface from the design spec.

- [ ] **Step 1: Write route tests using Fastify inject**

Cover:
- `GET /education/learners/vasilis` => 200 and grade `C`.
- `GET /education/learners/elenios/catalog` => all resources grade `A`.
- unknown learner => 404.
- invalid save payload => 400.
- stale page version => 409.
- activity check => structured `{ status }`.
- break evaluate => structured `defer|suggest|none`.

- [ ] **Step 2: Add Zod request schemas and typed error mapping**

`PUT /education/learners/:learnerId/pages/:pageId/state` body:

```ts
const savePageStateSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  state: z.object({
    pageId: z.string().min(1),
    learnerId: z.enum(['vasilis', 'elenios']),
    version: z.number().int().nonnegative(),
  }).passthrough(),
});
```

Map:
- unknown learner/resource/page/activity => 404
- Zod validation failure => 400
- grade mismatch => 403
- `EducationVersionConflictError` => 409

- [ ] **Step 3: Register repository/service in `buildApp` and routes in `server`**

Add `educationRepository: PostgresEducationRepository` and `educationService: EducationService` to `AgnesApp`. Register `registerEducationRoutes(app, services.educationService)` after health routes.

- [ ] **Step 4: Run route/build tests and commit**

Run: `npm test -- tests/unit/education-routes.test.ts tests/unit/build-app.test.ts`
Expected: PASS.

```bash
git add src/transport/education-routes.ts src/app/server.ts src/app/build-app.ts tests/unit/education-routes.test.ts tests/unit/build-app.test.ts
git commit -m "feat: expose education API"
```

---

### Task 8: End-to-end education flow and verification

**Files:**
- Create: `tests/e2e/education-flow.test.ts`
- Modify: `README.md` only if route-start instructions are missing.

**Interfaces:**
- Validates the complete backend contract the future 3D client will consume.

- [ ] **Step 1: Add a Vasilis Γ΄ end-to-end flow**

The flow must:
1. fetch Vasilis profile and assert grade `C`;
2. fetch Γ΄ catalog;
3. fetch the sample math page;
4. save a numeric answer overlay;
5. check the activity and receive `correct`;
6. verify resume points to the same page;
7. evaluate a due break while `activityInProgress=true` and receive `defer`;
8. evaluate at boundary and receive `suggest`.

- [ ] **Step 2: Add an Elenios Α΄ grade-isolation assertion**

Attempt to fetch the Γ΄ resource as Elenios and assert HTTP 403.

- [ ] **Step 3: Run complete quality gate**

Run: `npm run check`
Expected: ESLint PASS, TypeScript build PASS, all Vitest tests PASS.

- [ ] **Step 4: Review against acceptance criteria**

Confirm all eight design acceptance criteria are represented by code/tests. The approved 3D open-book UI itself is not rendered in this backend plan; this slice intentionally establishes the stable API/contracts it requires.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/education-flow.test.ts README.md
git commit -m "test: verify education backend flow"
```
