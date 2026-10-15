# AGNES Family OS UI v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first responsive, provider-independent AGNES Family OS presentation layer on top of the verified Core v1.

**Architecture:** Add a focused `src/presentation/web` subsystem with a typed view snapshot, deterministic renderer, CSS/client behavior modules, and Fastify routes. Existing domain and integration modules remain unchanged; the server composes the presentation routes beside `/health`.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, Vitest 3, native browser HTML/CSS/JavaScript generated from TypeScript modules, PostgreSQL 18 for existing integration tests.

**Spec:** `docs/superpowers/specs/2026-09-05-agnes-family-os-ui-v1-design.md`

## Global Constraints

- Preserve existing Core v1 module boundaries and provider independence.
- Add no provider SDK calls to presentation code.
- Add no new runtime dependency for UI v1.
- Do not commit private household names, schedules, health data, addresses, credentials or tokens.
- Keep `/health` behavior unchanged.
- Primary navigation is Home, Today, Family, Explore; AGNES AI is global.
- Use one visual system across all views.
- All externally supplied text rendered into HTML must be escaped.
- Verification is `npm run check` plus the existing GitHub Actions Core CI; local GitHub DNS is unavailable in the current execution environment.

---

### Task 1: Presentation snapshot contract

**Files:**
- Create: `src/presentation/web/family-os-snapshot.ts`
- Create: `tests/unit/family-os-snapshot.test.ts`

**Interfaces:**
- Produces: `FamilyOsSnapshot`, `ExploreModule`, `createFallbackFamilyOsSnapshot(now?: Date): FamilyOsSnapshot`.
- Consumes: no Core provider SDKs or repositories.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createFallbackFamilyOsSnapshot } from '../../src/presentation/web/family-os-snapshot.js';

describe('createFallbackFamilyOsSnapshot', () => {
  it('contains every UI v1 Explore module without private household data', () => {
    const snapshot = createFallbackFamilyOsSnapshot(new Date('2026-09-05T06:58:00.000Z'));
    expect(snapshot.exploreModules.map((module) => module.id)).toEqual([
      'kids', 'cooking', 'travel', 'tonight', 'health', 'calendar', 'never-miss',
      'shop', 'finance', 'car', 'smart-home', 'pets', 'music', 'learning',
      'services', 'translator', 'memories',
    ]);
    expect(snapshot.members).toHaveLength(4);
    expect(JSON.stringify(snapshot)).not.toContain('DATABASE_URL');
  });
});
```

- [ ] **Step 2: Verify RED**

Run through GitHub Actions after the test-only commit. Expected: TypeScript/test failure because `family-os-snapshot.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed snapshot**

Define readonly interfaces for weather, member status, attention, timeline item and Explore module. Build a generic fallback snapshot with four role-based members and the 17 module IDs from the spec.

- [ ] **Step 4: Verify GREEN**

Run `npm run check` in CI. Expected: snapshot test and existing suite pass.

---

### Task 2: Safe renderer and visual shell

**Files:**
- Create: `src/presentation/web/escape-html.ts`
- Create: `src/presentation/web/agnes-styles.ts`
- Create: `src/presentation/web/agnes-client.ts`
- Create: `src/presentation/web/render-family-os.ts`
- Create: `tests/unit/render-family-os.test.ts`

**Interfaces:**
- Consumes: `FamilyOsSnapshot` from Task 1.
- Produces: `escapeHtml(value: string): string`, `renderFamilyOs(snapshot: FamilyOsSnapshot): string`.

- [ ] **Step 1: Write renderer tests first**

Tests assert that output contains Home/Today/Family/Explore primary navigation, `data-view="home"`, `data-view="today"`, `data-view="family"`, `data-view="explore"`, the global AGNES control, all 17 Explore module IDs, and escaped external text (`<script>` becomes `&lt;script&gt;`).

- [ ] **Step 2: Verify RED**

Expected: renderer module missing.

- [ ] **Step 3: Implement escape helper and renderer**

Render one self-contained semantic HTML document. Keep styles and client behavior in dedicated TypeScript string modules imported by the renderer. Use CSS variables for the single purple/sea/earth visual system. Use media queries for desktop rail and mobile bottom navigation. Home uses a large atmospheric family-stage hero; Today uses an attention card plus timeline; Family uses member surfaces; Explore uses module cards and an in-shell module detail surface.

- [ ] **Step 4: Implement client behavior**

The browser script switches primary views, opens Explore module details, opens/closes the AGNES assistant overlay, updates the visible local time, supports Escape, and preserves ARIA selected/hidden states.

- [ ] **Step 5: Verify GREEN**

Expected: renderer tests and existing suite pass under `npm run check`.

---

### Task 3: Fastify presentation routes

**Files:**
- Create: `src/transport/agnes-web-routes.ts`
- Create: `tests/unit/agnes-web-routes.test.ts`

**Interfaces:**
- Consumes: `createFallbackFamilyOsSnapshot`, `renderFamilyOs`.
- Produces: `registerAgnesWebRoutes(app: FastifyInstance, options?: { snapshotFactory?: () => FamilyOsSnapshot }): Promise<void>`.

- [ ] **Step 1: Write failing route tests**

Use Fastify injection. Assert `GET /` returns status 200, `content-type` contains `text/html`, and body contains `AGNES`. Assert `GET /ui/snapshot` returns status 200 and JSON with `exploreModules` length 17.

- [ ] **Step 2: Verify RED**

Expected: route module missing.

- [ ] **Step 3: Implement routes**

Register `/` and `/ui/snapshot`. Use an injected snapshot factory when supplied; otherwise use `createFallbackFamilyOsSnapshot()`.

- [ ] **Step 4: Verify GREEN**

Expected: route tests pass and `/health` tests remain unchanged.

---

### Task 4: Server composition

**Files:**
- Modify: `src/app/server.ts`
- Create: `tests/unit/server-presentation-registration.test.ts` only if composition cannot be proven through the route unit test without starting PostgreSQL.

**Interfaces:**
- Consumes: `registerAgnesWebRoutes` from Task 3.
- Produces: running Fastify server with `/health`, `/`, and `/ui/snapshot`.

- [ ] **Step 1: Add a composition assertion**

Prefer a source-level or extracted registration function test that does not require a live listener. If extraction is needed, create a small `registerHttpRoutes(app)` function and test both `/health` and `/` through `app.inject()`.

- [ ] **Step 2: Verify RED**

Expected: presentation route absent from composed app.

- [ ] **Step 3: Register web routes beside health routes**

Keep `buildApp` and Core service lifecycle unchanged.

- [ ] **Step 4: Verify GREEN**

Expected: all unit/integration/e2e tests pass.

---

### Task 5: Repository verification and review

**Files:**
- Modify only if verification finds a concrete issue.

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: CI-verified feature branch and reviewable pull request.

- [ ] **Step 1: Run full verification**

Use GitHub Actions Core CI on a pull request to `main`. Required checks: lint, TypeScript build, unit/integration tests, calendar-to-notification E2E, formatting.

- [ ] **Step 2: Inspect failures by job and step**

Fix only evidenced failures, preserving the approved architecture.

- [ ] **Step 3: Re-run until green**

Do not claim completion before the head commit has a successful CI status.

- [ ] **Step 4: Review diff**

Confirm no private data, no provider coupling, no legacy UI import, and no unrelated Core changes.

- [ ] **Step 5: Leave the feature in a reviewable PR**

Do not merge to `main` without explicit user instruction.
