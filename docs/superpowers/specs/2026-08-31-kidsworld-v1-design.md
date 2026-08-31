# KidsWorld v1 Design

Date: 2026-08-31
Status: Approved product direction; implementation pending
Branch: `design/kidsworld-v1`

## 1. Purpose

KidsWorld is the first user-facing vertical slice of the greenfield AGNES Personal & Family Operating System. It is not a standalone children's app and it does not reintroduce the pre-greenfield screen architecture. It is a first-class AGNES domain and UI surface built on the existing household, person, calendar, permissions, event, outbox, persistence, and intelligence contracts.

The v1 outcome is a real, navigable, responsive product for child profiles with deterministic persistence and APIs. Visual concept images are design references only; the implementation must be composed from real UI components, domain state, and APIs.

## 2. Current Foundation

The existing repository provides:

- canonical `HouseholdId` and `PersonId` identities;
- a `Person` model with household membership, role, locale, timezone, permissions profile, and lifecycle status;
- calendar events with owner and participant person IDs;
- PostgreSQL repositories and SQL migrations;
- versioned AGNES domain events, transactional outbox processing, and recovery;
- a capability policy engine;
- Fastify transport and an application composition root;
- deterministic unit, integration, and end-to-end test patterns.

KidsWorld must extend these contracts rather than duplicate them.

## 3. Product Scope

### 3.1 Child entry

KidsWorld starts with a profile chooser for eligible child persons in the active household. For the first household this will surface Vasilis and Elenios, but names are data, not hard-coded routing decisions.

Each child has a KidsWorld profile containing presentation and progression preferences while identity remains owned by `Person`.

### 3.2 Required v1 surfaces

The first production slice includes these navigable surfaces:

1. KidsWorld Home / profile chooser
2. My Day
3. School World
4. Explorer World
5. Story Adventure
6. Games / Arcade
7. Create Studio
8. Rewards
9. Bedtime World
10. Parent Summary

All surfaces must be functional UI states, not screenshots. Features without a live external provider may use seeded or local catalog content behind stable contracts, but progression, missions, rewards, completion state, and parent summary are persisted.

### 3.3 Non-goals for v1

The first slice does not include:

- a school-provider integration;
- open-ended social/chat features between children;
- purchases or real-money rewards;
- unrestricted child access to the general AGNES AI assistant;
- procedural 3D game engines;
- live voice synthesis or speech recognition;
- arbitrary user-generated public content;
- replacement of the existing AGNES Core architecture.

These can be added after the vertical slice proves the contracts.

## 4. Architecture Decision

### 4.1 Repository shape

Keep the existing backend in `src/` and add a web client under `web/`.

- Backend: TypeScript + Fastify + PostgreSQL, following current repository patterns.
- Frontend: React + TypeScript + Vite.
- Routing: React Router.
- API validation: Zod at the transport boundary.
- Client state: server state fetched through typed API functions; local component state for ephemeral UI. No global state framework in v1.
- Styling: CSS modules or colocated plain CSS with shared design tokens; no dependency on generated images for structural UI.

The root package remains the repository control plane. Scripts are extended to build/test both backend and web without moving the current Core code into a new workspace during this feature.

### 4.2 Backend domain boundary

Add `src/kidsworld/` as an isolated domain/application boundary. It owns KidsWorld-specific progression and reward rules but references canonical AGNES IDs.

Proposed modules:

- `kidsworld-profile.ts`
- `mission.ts`
- `star-ledger.ts`
- `learning-progress.ts`
- `routine-progress.ts`
- `reward.ts`
- `kidsworld-repository.ts`
- `get-kidsworld-dashboard.ts`
- `complete-mission.ts`
- `record-learning-session.ts`
- `complete-routine-step.ts`
- `request-reward.ts`

Transport lives in `src/transport/kidsworld-routes.ts`. PostgreSQL implementation lives in `src/persistence/postgres-kidsworld-repository.ts`. The composition root in `src/app/build-app.ts` wires the repository and services.

## 5. Domain Model

### 5.1 KidsWorldProfile

Keyed one-to-one by `PersonId`.

Fields:

- `personId`
- `householdId`
- `avatarKey`
- `companionKey`
- `themeKey`
- `xp`
- `starsBalance`
- `status`
- `createdAt`
- `updatedAt`

A KidsWorld profile cannot exist for a person outside the same household. Person display name, birth date, locale, timezone, and role remain canonical in the household domain.

### 5.2 Mission

A mission is a concrete child action with a lifecycle.

Fields:

- `id`
- `householdId`
- `personId`
- `type`: `routine | learning | activity | exploration | story | creative`
- `title`
- `description`
- `scheduledFor`
- `rewardStars`
- `status`: `available | completed | expired | cancelled`
- `source`: `system | calendar | parent | content`
- `sourceReference`
- `completedAt`

Completing the same mission twice must never award stars twice.

### 5.3 Star ledger

Stars are ledger-based, not a freely mutated counter.

Each entry contains:

- `id`
- `householdId`
- `personId`
- `amount`
- `reason`
- `correlationId`
- `createdAt`

`correlationId` is unique per person. Mission completion, reward redemption, and administrative adjustments therefore remain idempotent. `starsBalance` is derived transactionally from the ledger and may be denormalized on the profile for efficient reads.

### 5.4 Learning progress

Learning progress is aggregated per subject:

- `personId`
- `subject`: `maths | greek | english | science | geography`
- `level`
- `completedSessions`
- `totalMinutes`
- `currentStreak`
- `updatedAt`

A learning session records duration and completion, then updates the aggregate atomically.

### 5.5 Routine progress

Routine progress records dated steps such as bag preparation, water, reading, bath, story, sounds, and bedtime.

The primary v1 routine categories are `morning`, `after-school`, and `bedtime`. A `(personId, localDate, routine, stepKey)` completion is unique.

### 5.6 Family rewards

Rewards belong to a household and may require parent approval.

Reward catalog fields:

- `id`
- `householdId`
- `name`
- `description`
- `costStars`
- `requiresParentApproval`
- `active`

A child creates a reward request. If approval is required, stars are reserved only when the request is approved. The v1 UI includes examples such as Movie Night, Choose Dinner, and Special Gift, but these are seeded household data rather than hard-coded logic.

## 6. Persistence

Add migration `src/persistence/migrations/002_kidsworld.sql` with tables for:

- `kidsworld_profiles`
- `kidsworld_missions`
- `kidsworld_star_ledger`
- `kidsworld_learning_progress`
- `kidsworld_learning_sessions`
- `kidsworld_routine_progress`
- `kidsworld_rewards`
- `kidsworld_reward_requests`

All person and household references use existing UUID identity values and foreign keys where current Core tables permit them. Uniqueness constraints enforce idempotency for mission completion, star correlations, learning session IDs, and routine steps.

No JSON blob is used as the primary persistence model for progression. Catalog presentation metadata may use constrained JSON only where a relational column would add no query or integrity value.

## 7. Events and Transactions

KidsWorld emits versioned AGNES events through the existing outbox pattern:

- `kidsworld.mission.completed.v1`
- `kidsworld.stars.awarded.v1`
- `kidsworld.learning.session.completed.v1`
- `kidsworld.routine.step.completed.v1`
- `kidsworld.reward.requested.v1`
- `kidsworld.reward.approved.v1`

State changes and their outbox records must be committed in one PostgreSQL transaction.

Example mission completion flow:

1. Load mission and verify household/person ownership.
2. Reject unavailable, expired, or foreign missions.
3. Mark the mission complete only if not already complete.
4. Insert a unique star ledger award correlated to the mission ID.
5. Update profile balance/XP.
6. Write versioned outbox events.
7. Commit once.
8. Return the new progression snapshot.

Retrying step 1 with the same mission returns the existing completion result and does not create another star entry.

## 8. Calendar and My Day

My Day is not a manually duplicated schedule. The backend composes it from:

- canonical calendar events owned by or containing the child as a participant;
- KidsWorld missions scheduled for the local day;
- routine steps due that day.

The child's canonical timezone controls day boundaries. The API returns a single sorted timeline view model so the web client does not reproduce calendar business rules.

When no live school/activity provider is present, seeded canonical calendar events can be used for development/demo data. The client contract remains identical when real connectors arrive.

## 9. API Contract

Initial routes:

- `GET /api/kidsworld` — eligible child profiles for the current household context.
- `GET /api/kidsworld/:personId/dashboard?date=YYYY-MM-DD` — one child dashboard with profile, Today timeline, missions, progress, rewards summary, and feature availability.
- `POST /api/kidsworld/:personId/missions/:missionId/complete`
- `POST /api/kidsworld/:personId/learning-sessions`
- `POST /api/kidsworld/:personId/routines/:routine/steps/:stepKey/complete`
- `POST /api/kidsworld/:personId/reward-requests`
- `GET /api/kidsworld/parent-summary`
- `POST /api/kidsworld/reward-requests/:requestId/approve`

Every mutation requires an idempotency/correlation identifier either derived from the domain object or supplied and validated by the server contract.

Error responses use typed application errors mapped consistently to HTTP status codes. The UI must distinguish validation, permission, conflict/idempotency, unavailable dependency, and unexpected failure states.

## 10. Permissions and Child Safety

Extend AGNES capability policy with KidsWorld-specific capabilities:

Child self-service:

- `kidsworld.read_self`
- `kidsworld.complete_mission_self`
- `kidsworld.record_learning_self`
- `kidsworld.complete_routine_self`
- `kidsworld.request_reward_self`

Parent/guardian:

- `kidsworld.read_household`
- `kidsworld.manage_rewards`
- `kidsworld.approve_rewards`

A child may not switch into parent summary merely by changing the URL. Authorization is enforced server-side.

Free-form AI generation is not a direct v1 child capability. Create Studio and Story Adventure use curated, age-appropriate local content/contracts first. A future model-backed provider must be introduced behind a separate child-content safety gateway before open generation is enabled.

## 11. Web Application

### 11.1 Routes

Proposed client routes:

- `/kids`
- `/kids/:personId`
- `/kids/:personId/today`
- `/kids/:personId/school`
- `/kids/:personId/explore`
- `/kids/:personId/stories`
- `/kids/:personId/games`
- `/kids/:personId/create`
- `/kids/:personId/rewards`
- `/kids/:personId/bedtime`
- `/kids/parent`

### 11.2 UI structure

Shared UI shell:

- KidsWorld brand/header
- active child identity
- star/XP indicators
- companion prompt area
- responsive primary navigation
- error/offline state

Feature areas are independent route components. The Home screen is a real navigation hub; the concept-art bedroom is translated into semantic interactive cards and themed surfaces rather than used as one flattened background screenshot.

### 11.3 Responsive behavior

The application supports three layout targets from the same component system:

- monitor/TV panel;
- tablet landscape/portrait;
- mobile.

Desktop emphasizes a spatial dashboard. Mobile becomes full-screen cards with bottom navigation. Touch targets are at least 44 CSS pixels and keyboard navigation remains available.

### 11.4 Visual system

The visual system follows the established KidsWorld direction:

- deep/slate purple foundation rather than pure black;
- pastel purple, blue, mint, warm gold accents;
- large rounded cards;
- soft depth and motion;
- minimal text per child-facing surface;
- clear Greek-first labels with English only where part of learning content;
- visual differentiation between Vasilis and Elenios without separate codebases.

Motion must respect `prefers-reduced-motion`.

## 12. Content Strategy

School, Explorer, Stories, Games, and Create Studio use typed local catalogs for v1. Catalogs define stable IDs, titles, skill tags, difficulty, star rewards, and presentation metadata.

Catalog content is not considered domain state. Completion and progression are domain state and persist in PostgreSQL.

This separation allows future external curriculum, game, or AI providers to replace catalog sources without rewriting reward and progress rules.

## 13. Parent Summary

The parent summary is deliberately concise. For each child it returns:

- today's completed/remaining missions;
- learning minutes and subject progress;
- stars earned/spent;
- new badges or milestones;
- pending reward requests;
- tomorrow preparation items derived from calendar and routines where available.

The parent surface does not expose implementation diagnostics or child-only game chrome.

## 14. Failure and Offline Behavior

Backend:

- database failures fail closed for mutations;
- duplicate completion is idempotent, not treated as a fatal error;
- unavailable optional content providers degrade to local catalog content;
- permission failures never leak another person's KidsWorld state.

Frontend:

- cached read-only dashboard data may remain visible with a stale indicator;
- mutations require confirmed server success before showing permanent reward changes;
- optimistic animations may run only if they can be rolled back cleanly;
- empty states must explain what is unavailable rather than rendering blank cards.

## 15. Testing Strategy

### Unit

Cover:

- mission lifecycle and duplicate completion;
- star ledger idempotency;
- reward affordability and approval rules;
- learning progress aggregation;
- routine step uniqueness;
- Today timeline ordering and local-date boundaries;
- capability decisions.

### Integration

Use PostgreSQL to verify:

- migration integrity and foreign keys;
- transactional mission completion + star ledger + outbox;
- reward request/approval transactions;
- repository round-trips;
- concurrent duplicate completion cannot double-award.

### Transport

Fastify injection tests verify schemas, permissions, status codes, and typed errors.

### Web

Use Vitest + Testing Library for routing, loading/error states, mission completion, reward request, responsive navigation state, and accessibility-critical interactions.

### End-to-end vertical slice

A required e2e scenario creates a household and child person, seeds a calendar event and mission, loads the child's dashboard, completes the mission, verifies one star award and outbox event, records progress, and verifies the parent summary reflects the result.

## 16. Delivery and CI

Extend CI rather than replace Core CI. Required verification before merge:

- format check;
- lint;
- backend TypeScript build;
- web production build;
- unit tests;
- PostgreSQL integration tests;
- transport tests;
- web tests;
- KidsWorld e2e vertical slice.

The existing Core v1 suite must remain green.

## 17. Seed Data

Development seed data may create the two initial child profiles and sample KidsWorld content, but production code must not depend on names such as Vasilis or Elenios.

Seed examples can include school, English, football, story, explorer, creative, arcade, and bedtime missions so every route has an immediately testable state.

## 18. Acceptance Criteria

KidsWorld v1 is complete only when all of the following are true:

1. A real child profile chooser is rendered from API data.
2. A child can navigate every required v1 surface without static screenshot substitution.
3. My Day combines calendar and KidsWorld tasks using the child's timezone.
4. Completing a mission persists state and awards stars exactly once under retries/concurrency.
5. Learning and bedtime progress persist across process restarts.
6. Reward requests are persisted and parent approval is server-authorized.
7. Parent Summary reflects child actions from persisted data.
8. Child routes cannot access another household or parent-only actions.
9. The UI works on monitor, tablet, and mobile layouts.
10. Blank/failed providers show explicit degraded states rather than empty screens.
11. All Core tests and all new KidsWorld tests pass in CI.
12. The implementation contains no dependency on the generated concept images for navigation or core interaction.

## 19. Implementation Sequence

The implementation plan should preserve one vertical slice at every stage:

1. KidsWorld IDs/domain + migration + repository.
2. Mission completion/star ledger transaction + events.
3. Dashboard composition with calendar integration.
4. Fastify routes and permission enforcement.
5. React/Vite shell and typed API client.
6. Home + My Day with live backend state.
7. Remaining feature routes using typed catalogs and persisted progression.
8. Rewards + Parent Summary.
9. Responsive/accessibility polish.
10. Full e2e, CI, and regression verification.

This sequence keeps the system deployable and testable instead of building nine disconnected screens first.
