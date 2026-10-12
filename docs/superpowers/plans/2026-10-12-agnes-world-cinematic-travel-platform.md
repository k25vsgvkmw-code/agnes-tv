# AGNES World — Cinematic Travel Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Greece-first travel dashboard with the approved global AGNES World cinematic experience, supporting Air, Sea, Rail and Road journeys, month-aware discovery, departure-port-first cruises, reusable journey detail, and deterministic AGNES personalisation.

**Architecture:** Keep the existing static GitHub Pages deployment and browser-native ES modules under `docs/travel`. Introduce a generic journey data/state/render pipeline, keep cruise behavior as a specialised layer over the same journey model, and migrate the visible product away from road-trip-only modules without deleting them until regression coverage proves the generic system is stable.

**Tech Stack:** HTML5, CSS, browser-native ES modules, Node.js 24, Vitest 3, existing GitHub Pages workflow.

**Spec:** `docs/superpowers/specs/2026-10-12-agnes-world-cinematic-travel-platform-design.md`

## Global Constraints

- Preserve the existing static GitHub Pages architecture under `docs/travel`; do not introduce React, Vue, another SPA framework, or a new build pipeline.
- The visible product must use the approved deep black / midnight navy, warm cream, restrained gold, editorial-serif cinematic system; do not fall back to a bright OTA/dashboard aesthetic.
- The global promise is `See the world differently. By air. By sea. By rail. By road.`
- Journey discovery must support `air`, `sea`, `rail`, and `road` entry points.
- Journey detail must remain story-first: Hero → exactly 3 Signature Moments → Route → cinematic chapters → operational detail → AGNES → inquiry summary.
- Month-aware ranking is deterministic and based on curated local metadata, not live weather or availability.
- Cruise discovery is departure-port-first and seasonality-aware.
- No unverified price, operator, vessel, flight, sailing date, availability, support guarantee, cancellation policy, or booking capability may be presented as live/confirmed.
- The first release does not execute payment. CTAs use `Plan with AGNES`, `Check options`, `Request availability`, or equivalent inquiry language.
- The assistant is labelled `AGNES`, never `AGNES Live`, until a real endpoint is configured and reachable.
- Missing media must degrade to a readable cinematic fallback.
- Direct refresh of query-state URLs must reconstruct the same view on GitHub Pages.
- Respect `prefers-reduced-motion`; all controls, filters, overlays, and close/back actions must be keyboard accessible.
- Existing `.github/workflows/travel-pages.yml` remains the only Travel deployment workflow.

## Review Focus

1. **December → January season boundary:** `coming-next` must wrap correctly across the year; pinned in Task 2 seasonality tests.
2. **Invalid or stale URL state:** unknown views, modes, ports, months, and journey IDs must normalise to a safe Explore state; pinned in Task 3 state tests and Task 8 integration tests.
3. **Departure port with zero cruise matches:** cruise discovery must show a curated fallback/empty-state explanation rather than a blank grid; pinned in Task 5 renderer tests.
4. **Missing or failed media:** title, narrative and CTA must remain readable and usable; pinned in Task 5/6 renderer tests and Task 7 media tests.
5. **Unsupported AGNES input:** state must remain unchanged and the reply must describe bounded supported capabilities without implying live booking/AI; pinned in Task 4 tests.

---

## File Structure

### Create

- `docs/travel/journeys-data.js` — canonical global curated journey collection and lookup/filter helpers.
- `docs/travel/seasonality.js` — month classification, ranking, and `Right Now` / `Coming Next` helpers.
- `docs/travel/journey-state.js` — validated application state plus URL parse/serialize helpers.
- `docs/travel/agnes-journey.js` — deterministic global AGNES intents and safe fallback behavior.
- `docs/travel/cinematic-render.js` — global shell, Explore, collections, generic journey detail, operational layer and AGNES dock renderers.
- `docs/travel/cruise-render.js` — cruise search/filter UI, departure-port rail, cruise-specific detail fragments.
- `docs/travel/cinematic.css` — single dark cinematic design system used by every new visible screen.
- `docs/travel/assets/world/credits.json` — provenance/license metadata for locally shipped world imagery.
- `docs/travel/assets/world/**` — representative local editorial media for launch journeys and collections.
- `tests/travel-journeys-data.test.mjs`
- `tests/travel-seasonality.test.mjs`
- `tests/travel-journey-state.test.mjs`
- `tests/travel-agnes-world.test.mjs`
- `tests/travel-cinematic-render.test.mjs`
- `tests/travel-cruise-render.test.mjs`
- `tests/travel-world-assets.test.mjs`
- `tests/travel-world-integration.test.mjs`
- `tests/travel-cinematic-styles.test.mjs`

### Modify

- `docs/travel/app.js` — replace dashboard-first mounting with URL/state-driven AGNES World orchestration.
- `docs/travel/index.html` — global AGNES shell/meta/navigation hooks and `cinematic.css` inclusion.
- `docs/travel/styles.css` — keep only compatibility/base rules required by legacy components during migration; visible AGNES World styling lives in `cinematic.css`.
- `tests/travel-app-regression.test.mjs` — update regression expectations from legacy top-level dashboard views to the new world architecture while retaining legacy ranking utility coverage.

### Retain during migration

- `trip-data.js`, `trip-state.js`, `agnes-trip.js`, `road-trip-render.js`, `road-trip-polish.css` — keep temporarily so their verified behavior is available as a reference/compatibility path; remove only in a later cleanup after the generic system ships.
- `ranking.js` and `data-1.json` … `data-4.json` — keep as legacy utility data unless the new Explore flow no longer needs them; do not silently reinterpret their availability fields as live inventory.

---

### Task 1: Define the Global Journey Contract and Seed Collection

**Files:**
- Create: `docs/travel/journeys-data.js`
- Create: `tests/travel-journeys-data.test.mjs`

**Interfaces:**
- Produces `JOURNEYS`, `DEPARTURE_PORTS`, `getJourneyById(id)`, `filterJourneys(journeys, filters)`.
- `filterJourneys` accepts `{ mode?, region?, feeling?, type?, departurePort? }` and returns a new array without mutating `JOURNEYS`.
- Every journey has: `id`, `type`, `mode`, `title`, `subtitle`, `country`, `region`, `duration`, `hero`, `bestMonths`, `shoulderMonths`, `eventMonths`, `avoidMonths`, `yearRound`, `signatureMoments`, `route`, `chapters`, `pricing`, `agnesRules`, `media`.
- Cruise journeys additionally expose `cruise.departurePort`, `cruise.returnPort`, `cruise.portsOfCall`, `cruise.ship`, `cruise.cabinClasses`, `cruise.sampleDepartures`.

- [ ] **Step 1: Write failing schema and seed tests**

Assert:

```js
expect(new Set(JOURNEYS.map((journey) => journey.id)).size).toBe(JOURNEYS.length);
expect(new Set(JOURNEYS.map((journey) => journey.mode))).toEqual(
  new Set(['air', 'sea', 'rail', 'road']),
);
expect(JOURNEYS.every((journey) => journey.signatureMoments.length === 3)).toBe(true);
expect(getJourneyById('zagori-metsovo-meteora')).toBeTruthy();
expect(getJourneyById('greek-islands-limassol')?.cruise?.departurePort).toBe('limassol');
expect(getJourneyById('missing')).toBeNull();
```

Also pin representative seed IDs across Road, Rail, Sea and Air from the spec, plus the full departure hub metadata list required by the cruise selector.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run tests/travel-journeys-data.test.mjs`

Expected: FAIL because `journeys-data.js` does not exist.

- [ ] **Step 3: Implement `journeys-data.js`**

Create the reusable journey objects. Reuse the existing Zagori editorial content through a data migration/adapter, not by importing renderer state. Seed enough content for the launch collections to visibly cover all four modes and multiple world regions. Demo pricing/date fields, where present, must carry an explicit `indicative: true` or equivalent disclaimer field.

- [ ] **Step 4: Run the focused test and verify pass**

Run: `npx vitest run tests/travel-journeys-data.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/journeys-data.js tests/travel-journeys-data.test.mjs
git commit -m "feat(travel): add AGNES World journey catalog"
```

---

### Task 2: Build Deterministic Monthly Seasonality

**Files:**
- Create: `docs/travel/seasonality.js`
- Create: `tests/travel-seasonality.test.mjs`

**Interfaces:**
- Consumes journey month metadata from Task 1.
- Produces `classifyJourneySeason(journey, month) -> 'in-season' | 'coming-next' | 'year-round' | 'off-season'`.
- Produces `rankJourneysForMonth(journeys, month) -> journey[]`.
- Produces `getSeasonalCollections(journeys, month) -> { rightNow, comingNext, yearRound }`.
- Month input is integer `1..12`; invalid month values throw `RangeError` in pure helpers so caller normalisation stays explicit.

- [ ] **Step 1: Write failing all-month and year-boundary tests**

Test at least one journey for every month and explicitly pin:

```js
expect(classifyJourneySeason(summerCruise, 7)).toBe('in-season');
expect(classifyJourneySeason(summerCruise, 5)).toBe('coming-next');
expect(classifyJourneySeason(yearRoundJourney, 10)).toBe('year-round');
expect(classifyJourneySeason(januaryJourney, 12)).toBe('coming-next');
expect(() => classifyJourneySeason(januaryJourney, 13)).toThrow(RangeError);
```

Assert ranking order is `in-season` → `coming-next` → `year-round` → `off-season` and stable by editorial priority/title inside the same class.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-seasonality.test.mjs`

Expected: FAIL because module/functions do not exist.

- [ ] **Step 3: Implement `seasonality.js`**

Use month-set membership plus a two-month look-ahead that wraps across December/January. `eventMonths` may lift a journey into `in-season`; `avoidMonths` wins over shoulder/best month promotion unless the journey is explicitly event-led for that same month.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run tests/travel-seasonality.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/seasonality.js tests/travel-seasonality.test.mjs
git commit -m "feat(travel): add monthly journey seasonality"
```

---

### Task 3: Add Global Journey State and URL Reconstruction

**Files:**
- Create: `docs/travel/journey-state.js`
- Create: `tests/travel-journey-state.test.mjs`

**Interfaces:**
- Produces `createJourneyState(now = new Date())`.
- Produces `applyJourneyStatePatch(state, patch)` with immutable whitelisted updates.
- Produces `parseJourneyUrl(search, now = new Date())`.
- Produces `serializeJourneyUrl(state)`.
- State shape includes:

```js
{
  view: 'explore' | 'destinations' | 'mode' | 'cruises' | 'journey',
  mode: '' | 'air' | 'sea' | 'rail' | 'road',
  month: 1..12,
  region: '',
  feeling: '',
  departurePort: '',
  journeyId: '',
  detailLayer: null | 'route' | 'day-plan' | 'transport' | 'dates' | 'cabins' | 'agnes' | 'inquiry',
  selectedChapter: '',
  agnesHistory: []
}
```

- [ ] **Step 1: Write failing state and URL tests**

Pin default October behavior with an injected date, round-trip serialization, `?view=cruises&port=limassol`, `?mode=sea`, `?journey=greek-islands-limassol`, and invalid state normalisation.

```js
const state = createJourneyState(new Date('2026-10-12T12:00:00Z'));
expect(state.month).toBe(10);
expect(parseJourneyUrl('?view=cruises&port=limassol', fixedDate)).toMatchObject({
  view: 'cruises',
  departurePort: 'limassol',
});
expect(parseJourneyUrl('?view=nope&month=99', fixedDate)).toMatchObject({
  view: 'explore',
  month: 10,
});
```

Assert invalid patches cannot corrupt a prior valid mode/month/view.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-journey-state.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement `journey-state.js`**

Keep parsing browser-independent: accept strings/`URLSearchParams`, return plain state, and validate journey IDs/ports at orchestration time where catalog access exists.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run tests/travel-journey-state.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/journey-state.js tests/travel-journey-state.test.mjs
git commit -m "feat(travel): add AGNES World state and URL routing"
```

---

### Task 4: Generalise the Deterministic AGNES Co-pilot

**Files:**
- Create: `docs/travel/agnes-journey.js`
- Create: `tests/travel-agnes-world.test.mjs`

**Interfaces:**
- Consumes current journey/catalog/state.
- Produces `handleJourneyAgnesMessage(message, context) -> { reply, statePatch, focusTarget }`.
- `context` contains `{ journey, journeys, state }`.
- Supported first-release intents include: mode discovery, cruises from a departure port, month/season request, rail + mountains, sea + islands, shorter trip, less driving, romantic, family, better stays, rain plan.

- [ ] **Step 1: Write failing intent tests**

Pin these examples:

```js
'Show cruises from Limassol' -> { view: 'cruises', mode: 'sea', departurePort: 'limassol' }
'I want mountains by train' -> { view: 'mode', mode: 'rail', feeling: 'mountains' }
'I want sea and islands in October' -> { view: 'mode', mode: 'sea', month: 10, feeling: 'islands' }
```

Retain the existing journey-personalisation intents for 4-day, less-driving, romantic, family, better-stay and rain requests when a compatible journey is open.

Add an unsupported mixed-language input test proving `statePatch` is `{}`, source state is unchanged, and reply contains a bounded list of supported actions without `live`, `confirmed`, `I booked`, or equivalent claims.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-agnes-world.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement `agnes-journey.js`**

Reuse the robust accent/apostrophe normalisation pattern from `agnes-trip.js`. Match only explicit deterministic intent families; do not add network calls.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run tests/travel-agnes-world.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/agnes-journey.js tests/travel-agnes-world.test.mjs
git commit -m "feat(travel): generalize AGNES journey intents"
```

---

### Task 5: Render Global Explore and Departure-First Cruises

**Files:**
- Create: `docs/travel/cinematic-render.js`
- Create: `docs/travel/cruise-render.js`
- Create: `tests/travel-cinematic-render.test.mjs`
- Create: `tests/travel-cruise-render.test.mjs`

**Interfaces:**
- `cinematic-render.js` produces `renderGlobalHeader(state)`, `renderExploreHome(journeys, state)`, `renderModeCollection(journeys, state)`, `renderJourneyCard(journey, options)`, `renderAgnesWorldDock(state)`.
- `cruise-render.js` produces `filterCruises(journeys, state)`, `renderCruiseLanding(journeys, state)`, `renderDeparturePortRail(ports, state)`, `renderCruiseCard(journey, state)`.
- Renderers return HTML strings only and do not mutate `document`.

- [ ] **Step 1: Write failing Explore renderer tests**

Assert `renderExploreHome` contains:

- `AGNES WORLD`;
- `See the world differently.`;
- `By air. By sea. By rail. By road.`;
- four mode entry hooks: `data-mode="air|sea|rail|road"`;
- `Right Now` plus the injected month label;
- Featured journeys;
- regions Europe, Greece, Asia, Africa, Americas, Oceania;
- AGNES prompt entry;
- no `AGNES Live` and no legacy `93 προορισμοί από Λάρνακα` hero copy.

- [ ] **Step 2: Write failing cruise renderer tests**

Assert:

```js
expect(html.indexOf('data-cruise-filter="departure-port"')).toBeLessThan(
  html.indexOf('data-cruise-filter="month"'),
);
expect(html).toContain('data-departure-port="limassol"');
expect(html).toContain('In Season Now');
expect(html).toContain('Coming Next');
expect(html).toContain('Year-Round');
```

For a synthetic unmatched port, assert a non-empty `data-empty-cruise-state` plus a reset/other-port action instead of an empty grid.

- [ ] **Step 3: Run renderer tests and verify failure**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: FAIL.

- [ ] **Step 4: Implement the Explore and cruise discovery renderers**

Use `seasonality.js` for collection ordering. Cruise cards must say `From Limassol`/other port where relevant but must not claim live availability. Every media wrapper includes a stable fallback hook.

- [ ] **Step 5: Run tests and verify pass**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/cinematic-render.js docs/travel/cruise-render.js tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs
git commit -m "feat(travel): render AGNES World discovery and cruises"
```

---

### Task 6: Build Reusable Cinematic Journey Detail and Operational Layers

**Files:**
- Modify: `docs/travel/cinematic-render.js`
- Modify: `docs/travel/cruise-render.js`
- Modify: `tests/travel-cinematic-render.test.mjs`
- Modify: `tests/travel-cruise-render.test.mjs`

**Interfaces:**
- `renderJourneyDetail(journey, state)` renders the generic emotional-to-operational sequence.
- `renderOperationalLayer(journey, state)` renders a desktop side panel / mobile sheet contract with `data-detail-layer` and `data-detail-close`.
- `renderCruiseDetail(journey, state)` composes generic sections with cruise route/ship/cabins/sample-date fragments.
- `renderInquirySummary(journey, state)` never renders a payment CTA.

- [ ] **Step 1: Add failing generic journey-detail tests**

Assert section order: hero < signature moments < route < chapters < AGNES < inquiry. Assert exactly three signature moment elements. Assert departure and return chapters when the journey contract marks them applicable. Assert missing hero media preserves title/copy and emits `data-image-fallback="true"`.

- [ ] **Step 2: Add failing cruise-detail tests**

For `greek-islands-limassol`, assert hero metadata includes `From Limassol`, route/ports, ship overview, optional cabin/sample departure fragments marked demo/indicative, `Plan with AGNES` or `Request availability`, and **does not** contain `Pay now`, `Best price guarantee`, `24/7 support`, or `confirmed availability`.

- [ ] **Step 3: Run and verify failure**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: FAIL on new detail expectations.

- [ ] **Step 4: Implement detail renderers**

Generic chapter markup stays mode-neutral; specialised operational detail delegates cruise fragments to `cruise-render.js`. Escape AGNES/user free text before HTML insertion. Operational layer has semantic heading, close button and focusable content hooks.

- [ ] **Step 5: Run and verify pass**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/cinematic-render.js docs/travel/cruise-render.js tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs
git commit -m "feat(travel): add reusable cinematic journey detail"
```

---

### Task 7: Ship World Media with Provenance and Fallbacks

**Files:**
- Create: `docs/travel/assets/world/credits.json`
- Create: representative files under `docs/travel/assets/world/`
- Modify: `docs/travel/journeys-data.js`
- Create: `tests/travel-world-assets.test.mjs`

**Interfaces:**
- Every `media.*` path rendered in the launch collection is a relative local file or an intentional empty fallback.
- Every local editorial image has an entry in `credits.json` with `{ creator, license, sourceUrl, sourceLabel, useNote }`.

- [ ] **Step 1: Write failing asset/provenance tests**

Collect every rendered non-empty media path from `JOURNEYS`; assert it is local under `assets/world/` or the retained `assets/zagori/`, exists on disk, is non-trivial in size, and has matching provenance metadata. Allow explicitly generated/internal imagery to use a source label such as `AGNES generated editorial asset` with a provenance note rather than a Creative Commons claim.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-world-assets.test.mjs`

Expected: FAIL until launch imagery exists.

- [ ] **Step 3: Curate/download and store representative media**

Acquire destination-specific editorial imagery from sources with clear permitted reuse, store local derivatives, and preserve exact source/license metadata. Do not use an image as evidence for a specific commercial cabin/hotel/ship unless the data is verified as that exact product.

- [ ] **Step 4: Update journey media references and credits**

Keep the launch asset set intentionally limited: one strong hero plus reused/appropriate scene media per journey is sufficient; do not bloat the repository with an exhaustive catalog.

- [ ] **Step 5: Run and verify pass**

Run: `npx vitest run tests/travel-world-assets.test.mjs tests/travel-journeys-data.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/assets/world docs/travel/journeys-data.js tests/travel-world-assets.test.mjs
git commit -m "feat(travel): add licensed AGNES World media"
```

---

### Task 8: Integrate AGNES World into the Static App and URL Navigation

**Files:**
- Modify: `docs/travel/app.js`
- Modify: `docs/travel/index.html`
- Modify: `tests/travel-app-regression.test.mjs`
- Create: `tests/travel-world-integration.test.mjs`

**Interfaces:**
- `app.js` owns current state, URL synchronisation, DOM mounting and event wiring only.
- Pure ranking/state/render/AGNES logic stays in modules from Tasks 1–6.
- `popstate` reconstructs from `window.location.search`.
- Navigation clicks use `history.pushState` and rerender without server routes.

- [ ] **Step 1: Write failing app integration tests**

Source-level and pure integration checks must pin imports for `journeys-data.js`, `seasonality.js`, `journey-state.js`, `agnes-journey.js`, `cinematic-render.js`, `cruise-render.js`; URL handling for `?view=cruises&port=limassol` and `?journey=...`; journey/mode/port event hooks; and image fallback wiring.

Add an unknown journey-id test at the orchestration helper level: it must render/return Explore with a clear `Journey not found`/equivalent message, not throw.

Update old regression assertions so they no longer require the legacy dashboard views to be visible. Keep `travel-ranking.test.mjs` unchanged to prove the retained ranking utility still works.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-world-integration.test.mjs tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs`

Expected: FAIL until `app.js` is migrated.

- [ ] **Step 3: Rewrite `app.js` as the orchestration layer**

Remove the legacy home/dashboard as the default visible experience. Initial mount uses parsed URL state + browser month. Wire global nav, mode entries, journey cards, cruise filters/ports, operational layers, AGNES actions/form, back/close actions, and `popstate`.

- [ ] **Step 4: Update `index.html`**

Use English/global brand metadata, replace the hard-coded legacy button nav with a minimal shell that the cinematic renderer can own, include `cinematic.css`, retain the module entry point, and set the theme color to the dark AGNES foundation.

- [ ] **Step 5: Run integration tests and verify pass**

Run: `npx vitest run tests/travel-world-integration.test.mjs tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/app.js docs/travel/index.html tests/travel-world-integration.test.mjs tests/travel-app-regression.test.mjs
git commit -m "feat(travel): integrate AGNES World navigation"
```

---

### Task 9: Apply the Single Dark Cinematic Design System and Accessibility Rules

**Files:**
- Create: `docs/travel/cinematic.css`
- Modify: `docs/travel/styles.css`
- Create: `tests/travel-cinematic-styles.test.mjs`

**Interfaces:**
- `cinematic.css` owns all `.agnes-world-*`, `.journey-*`, `.cruise-*`, `.agnes-dock-*`, and operational-layer styling.
- `styles.css` may retain compatibility styles but must not override the visible AGNES World dark tokens.

- [ ] **Step 1: Write failing design-system tests**

Assert CSS contains tokens/selectors for dark foundation, cream/gold accents, editorial display typography, full-bleed hero, cinematic card overlays, journey chapters, cruise landing, departure rail, AGNES dock, operational layer, visible `:focus-visible`, mobile safe-area padding and image fallbacks.

Assert:

```js
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
expect(css).toContain('env(safe-area-inset-bottom)');
```

Add a guard that the world shell is not styled with the old `#eef5ff` / blue-purple dashboard background.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-cinematic-styles.test.mjs`

Expected: FAIL because `cinematic.css` does not exist.

- [ ] **Step 3: Implement `cinematic.css`**

Use a unified token layer. Desktop is immersive and wide; mobile uses normal document flow, horizontal collection rails where useful, full-screen/sheet operational detail, and a dock that never covers the final CTA. Reduced-motion disables snap/animated transitions and smooth-scroll assumptions.

- [ ] **Step 4: Reduce conflicting legacy base styles**

Keep `styles.css` loaded only for compatibility needed by retained legacy utilities. Remove/global-scope rules that force bright backgrounds/header chrome onto AGNES World.

- [ ] **Step 5: Run style tests and focused render tests**

Run: `npx vitest run tests/travel-cinematic-styles.test.mjs tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/cinematic.css docs/travel/styles.css tests/travel-cinematic-styles.test.mjs
git commit -m "feat(travel): apply AGNES World cinematic design system"
```

---

### Task 10: Full Verification, Browser QA, and Deployment Readiness

**Files:**
- Modify tests only if verification exposes a real regression.
- Do not modify `.github/workflows/travel-pages.yml` unless deployment itself is broken.

**Interfaces:**
- Delivers a branch that passes repository checks and can be merged to `main` for the already-enabled GitHub Pages deployment.

- [ ] **Step 1: Run the complete Travel-focused suite**

Run:

```bash
npx vitest run tests/travel-journeys-data.test.mjs tests/travel-seasonality.test.mjs tests/travel-journey-state.test.mjs tests/travel-agnes-world.test.mjs tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs tests/travel-world-assets.test.mjs tests/travel-world-integration.test.mjs tests/travel-cinematic-styles.test.mjs tests/travel-ranking.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run repository verification**

Run: `npm run check`

Expected: lint, TypeScript build and full Vitest suite PASS.

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 3: Browser QA the deployed-static artifact locally or through the branch preview method available**

Verify these scenarios at desktop, tablet and narrow mobile widths:

1. Explore loads as AGNES World and shows the four travel modes.
2. `Right Now` matches the browser month and changes with injected/test state.
3. Cruises opens with `Departing from` first and Limassol can be selected.
4. A cruise journey opens from card → cinematic detail → route/chapters → operational layer → AGNES → inquiry.
5. Road, Rail and Air journeys open through the same generic detail architecture.
6. Back/forward browser navigation reconstructs URL state.
7. Missing-image fallback remains readable.
8. Keyboard focus reaches nav, filters, cards, detail close and AGNES controls.
9. Reduced-motion mode has no mandatory animated/scroll-snap interaction.
10. No page has accidental horizontal body overflow and AGNES dock does not cover the final inquiry CTA.

- [ ] **Step 4: Run truthfulness copy audit**

Search the visible Travel code for prohibited unsupported claims:

```bash
rg -n "AGNES Live|best price guarantee|24/7 support|free cancellation|confirmed availability|Pay now" docs/travel
```

Expected: no production-visible unsupported claim; test fixtures may contain negative assertions only.

- [ ] **Step 5: Compare branch scope**

Review `main...feature/agnes-world-redesign` and confirm changes are limited to the approved design spec, implementation plan, Travel frontend, Travel tests, and required media. No unrelated Core changes.

- [ ] **Step 6: Commit any verification-only fixes**

```bash
git add docs/travel tests
# only if fixes were required
git commit -m "fix(travel): complete AGNES World verification"
```

Expected: clean working tree / branch after final verification.

---

## Completion Definition

The implementation is complete only when the user can open one coherent AGNES product and move through this complete flow without encountering the old dashboard aesthetic:

**Explore the world → choose Air / Sea / Rail / Road or a seasonal collection → open a curated journey → experience three signature moments and the route → reveal practical detail only when wanted → ask AGNES for deterministic personalisation → reach a truthful inquiry/planning action.**

For cruises, the equivalent entry flow is:

**Cruises → Departing from → Month/season → curated matching journeys → cinematic cruise detail → route/ship/operational detail → AGNES → inquiry.**
