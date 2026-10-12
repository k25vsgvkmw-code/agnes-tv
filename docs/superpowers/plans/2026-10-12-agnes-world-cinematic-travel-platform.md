# AGNES World — Cinematic Travel Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Greece-first travel dashboard with the approved global AGNES World cinematic experience, supporting Air, Sea, Rail and Road journeys, month-aware discovery, departure-port-first cruises, complete global navigation, reusable journey detail, and deterministic AGNES personalisation.

**Architecture:** Keep the existing static GitHub Pages deployment and browser-native ES modules under `docs/travel`. Introduce a generic journey data/state/render pipeline, keep cruise behavior as a specialised layer over the same journey model, and migrate the visible product away from road-trip-only modules without deleting them until regression coverage proves the generic system is stable.

**Tech Stack:** HTML5, CSS, browser-native ES modules, Node.js 24, Vitest 3, existing GitHub Pages workflow.

**Spec:** `docs/superpowers/specs/2026-10-12-agnes-world-cinematic-travel-platform-design.md`

## Global Constraints

- Preserve the existing static GitHub Pages architecture under `docs/travel`; do not introduce React, Vue, another SPA framework, or a new build pipeline.
- The visible product must use the approved deep black / midnight navy, warm cream, restrained gold, editorial-serif cinematic system; do not fall back to a bright OTA/dashboard aesthetic.
- The global promise is `See the world differently. By air. By sea. By rail. By road.`
- Primary navigation is Explore, Destinations, Travel by, Experiences, Cruises, About AGNES, Plan with AGNES.
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
3. **Departure port / contextual filter with zero matches:** discovery must show a curated fallback/empty-state explanation rather than a blank grid; pinned in Task 5 renderer tests.
4. **Missing or failed media:** title, narrative and CTA must remain readable and usable; pinned in Task 5/6 renderer tests and Task 7 media tests.
5. **Unsupported AGNES input:** state must remain unchanged and the reply must describe bounded supported capabilities without implying live booking/AI; pinned in Task 4 tests.

---

## File Structure

### Create

- `docs/travel/journeys-data.js` — canonical global curated journey collection, departure hubs and filter helpers.
- `docs/travel/seasonality.js` — month classification, ranking, and `Right Now` / `Coming Next` helpers.
- `docs/travel/journey-state.js` — validated application state plus URL parse/serialize helpers.
- `docs/travel/agnes-journey.js` — deterministic global AGNES intents and safe fallback behavior.
- `docs/travel/cinematic-render.js` — global shell, Explore, Destinations, Experiences, About, mode collections, generic journey detail, operational layer and AGNES dock renderers.
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
- `tests/travel-app-regression.test.mjs` — update regression expectations from legacy dashboard views to the new world architecture while retaining legacy ranking utility coverage.

### Retain during migration

- `trip-data.js`, `trip-state.js`, `agnes-trip.js`, `road-trip-render.js`, `road-trip-polish.css` — keep temporarily as a verified reference/compatibility path; remove only in a later cleanup after the generic system ships.
- `ranking.js` and `data-1.json` … `data-4.json` — keep as legacy utility data unless the new Explore flow no longer needs them; do not reinterpret their availability fields as live inventory.

---

### Task 1: Define the Global Journey Contract and Seed Collection

**Files:**
- Create: `docs/travel/journeys-data.js`
- Create: `tests/travel-journeys-data.test.mjs`

**Interfaces:**
- Produces `JOURNEYS`, `DEPARTURE_PORTS`, `getJourneyById(id)`, `filterJourneys(journeys, filters)`.
- `filterJourneys` accepts `{ mode?, region?, feeling?, type?, departurePort?, duration?, transportStyle? }` and returns a new array without mutating `JOURNEYS`.
- Every journey has: `id`, `type`, `mode`, `title`, `subtitle`, `country`, `region`, `duration`, `feelings`, `transportStyle`, `hero`, `bestMonths`, `shoulderMonths`, `eventMonths`, `avoidMonths`, `yearRound`, `signatureMoments`, `route`, `chapters`, `pricing`, `agnesRules`, `media`.
- Cruise journeys additionally expose `cruise.departurePort`, `cruise.returnPort`, `cruise.portsOfCall`, `cruise.destinationRegion`, `cruise.style`, `cruise.ship`, `cruise.cabinClasses`, `cruise.sampleDepartures`.

- [ ] **Step 1: Write failing schema, seed and filter tests**

Assert unique IDs, all four modes, exactly three signature moments, representative launch IDs across Road/Rail/Sea/Air, `greek-islands-limassol.cruise.departurePort === 'limassol'`, unknown ID returns `null`, and the full departure hub metadata list from the spec is present.

Also pin contextual filters:

```js
expect(filterJourneys(JOURNEYS, { mode: 'rail', transportStyle: 'scenic' }).every(
  (journey) => journey.mode === 'rail' && journey.transportStyle.includes('scenic'),
)).toBe(true);
expect(filterJourneys(JOURNEYS, { mode: 'road', type: 'caravan-road-trip' }).every(
  (journey) => journey.type === 'caravan-road-trip',
)).toBe(true);
expect(filterJourneys(JOURNEYS, { departurePort: 'limassol' }).every(
  (journey) => journey.cruise?.departurePort === 'limassol',
)).toBe(true);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run tests/travel-journeys-data.test.mjs`

Expected: FAIL because `journeys-data.js` does not exist.

- [ ] **Step 3: Implement `journeys-data.js`**

Create the reusable journey objects. Reuse the existing Zagori editorial content through a data migration/adapter, not renderer state. Seed enough content for all launch collections to visibly cover all four modes and multiple world regions. Demo pricing/date fields, where present, carry an explicit `indicative: true` or equivalent disclaimer field.

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

Exercise all 12 months and explicitly pin summer in-season, shoulder/coming-next, year-round, December→January wrapping, invalid month rejection, and ranking order `in-season` → `coming-next` → `year-round` → `off-season` with stable editorial priority/title ordering inside a class.

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
- State shape:

```js
{
  view: 'explore' | 'destinations' | 'experiences' | 'about' | 'mode' | 'cruises' | 'journey',
  mode: '' | 'air' | 'sea' | 'rail' | 'road',
  month: 1..12,
  region: '',
  feeling: '',
  duration: '',
  transportStyle: '',
  departurePort: '',
  cruiseDestination: '',
  cruiseStyle: '',
  journeyId: '',
  detailLayer: null | 'route' | 'day-plan' | 'transport' | 'dates' | 'cabins' | 'agnes' | 'inquiry',
  selectedChapter: '',
  agnesHistory: []
}
```

- [ ] **Step 1: Write failing state and URL tests**

Pin default October behavior with injected date, round-trip serialization, `?view=cruises&port=limassol`, `?mode=sea`, `?view=experiences&feeling=romantic`, `?journey=greek-islands-limassol`, and invalid view/month/mode normalisation back to Explore/current month. Assert invalid patches cannot corrupt prior valid state.

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
- Produces `handleJourneyAgnesMessage(message, context) -> { reply, statePatch, focusTarget }` with `context = { journey, journeys, state }`.
- Supported first-release intents: mode discovery, cruises from a departure port, month/season request, rail + mountains, sea + islands, shorter trip, less driving, romantic, family, better stays, rain plan.

- [ ] **Step 1: Write failing intent tests**

Pin:

```text
Show cruises from Limassol -> cruises / sea / limassol
I want mountains by train -> mode=rail / feeling=mountains
I want sea and islands in October -> mode=sea / month=10 / feeling=islands
```

Retain 4-day, less-driving, romantic, family, better-stay and rain intents when a compatible journey is open. Add unsupported mixed-language input proving `{}` patch, unchanged source state, bounded supported-capabilities reply, and no `live`, `confirmed`, `I booked`, or equivalent claims.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-agnes-world.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement `agnes-journey.js`**

Reuse accent/apostrophe normalisation from `agnes-trip.js`. Match only explicit deterministic intent families; do not add network calls.

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run tests/travel-agnes-world.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/agnes-journey.js tests/travel-agnes-world.test.mjs
git commit -m "feat(travel): generalize AGNES journey intents"
```

---

### Task 5: Render Global Navigation, Collections and Departure-First Cruises

**Files:**
- Create: `docs/travel/cinematic-render.js`
- Create: `docs/travel/cruise-render.js`
- Create: `tests/travel-cinematic-render.test.mjs`
- Create: `tests/travel-cruise-render.test.mjs`

**Interfaces:**
- `cinematic-render.js` produces `renderGlobalHeader(state)`, `renderExploreHome(journeys, state)`, `renderDestinationsIndex(journeys, state)`, `renderExperienceCollection(journeys, state)`, `renderModeCollection(journeys, state)`, `renderAboutAgnes()`, `renderJourneyCard(journey, options)`, `renderAgnesWorldDock(state)`.
- `cruise-render.js` produces `filterCruises(journeys, state)`, `renderCruiseLanding(journeys, state)`, `renderDeparturePortRail(ports, state)`, `renderCruiseCard(journey, state)`.
- Renderers return HTML strings only and do not mutate `document`.

- [ ] **Step 1: Write failing global renderer tests**

Assert global header exposes Explore, Destinations, Travel by, Experiences, Cruises, About AGNES, Plan with AGNES. Assert Explore contains `AGNES WORLD`, `See the world differently.`, `By air. By sea. By rail. By road.`, four mode hooks, `Right Now` with injected month, Featured journeys, Europe/Greece/Asia/Africa/Americas/Oceania, and AGNES prompt entry. Assert no `AGNES Live` and no legacy `93 προορισμοί από Λάρνακα` hero copy.

Assert Destinations groups curated journeys by region, Experiences can render at least Romantic/Wild/Slow/Family/Luxury/Hidden/Seasonal, and About AGNES describes the product without claiming a live assistant backend.

- [ ] **Step 2: Write failing contextual mode-filter tests**

For Road render month/region/duration plus Road vs Caravan controls. For Rail render month/region/duration plus Scenic/Sleeper/City-to-city. Global discovery supports mode/month/region/feeling. A zero-match filtered collection must contain `data-empty-collection` and reset action.

- [ ] **Step 3: Write failing cruise renderer tests**

Assert `departure-port` filter appears before month, Limassol is a departure hook, cruise filters include departure port/month/destination region/style/duration, and collections include In Season Now / Coming Next / Year-Round. For a synthetic unmatched port, assert non-empty `data-empty-cruise-state` plus reset/other-port action.

- [ ] **Step 4: Run renderer tests and verify failure**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: FAIL.

- [ ] **Step 5: Implement discovery renderers**

Use `seasonality.js` for monthly ordering and `filterJourneys` for contextual filters. Cruise cards may say `From Limassol`/other port but never claim live availability. Every media wrapper gets a stable fallback hook.

- [ ] **Step 6: Run tests and verify pass**

Run: `npx vitest run tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

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

Assert section order hero < signature moments < route < chapters < AGNES < inquiry, exactly three signature moments, departure and return when applicable, mode-specific transport summary for Air/Rail/Road/Sea, and missing hero media fallback with title/copy intact.

- [ ] **Step 2: Add failing cruise-detail tests**

For `greek-islands-limassol`, assert `From Limassol`, route/ports, ship overview, optional cabin/sample departure fragments marked demo/indicative, `Plan with AGNES` or `Request availability`, and absence of `Pay now`, `Best price guarantee`, `24/7 support`, `free cancellation`, or `confirmed availability`.

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
- Every rendered non-empty `media.*` path is a relative local file under `assets/world/` or retained `assets/zagori/`.
- Every local editorial image has provenance metadata `{ creator, license, sourceUrl, sourceLabel, useNote }`.

- [ ] **Step 1: Write failing asset/provenance tests**

Collect all non-empty media references, assert local existence/non-trivial size and matching provenance. Explicitly generated/internal imagery may use `AGNES generated editorial asset` plus provenance note rather than a Creative Commons claim.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-world-assets.test.mjs`

Expected: FAIL until launch imagery exists.

- [ ] **Step 3: Curate/download and store representative media**

Use destination-specific editorial imagery with clear permitted reuse, local derivatives, and exact source/license metadata. Do not use imagery as evidence for a specific commercial cabin/hotel/ship unless verified as that exact product.

- [ ] **Step 4: Update journey media references and credits**

Keep launch media intentionally limited: strong hero + reusable appropriate scene media per journey; avoid an exhaustive asset catalog.

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
- Pure ranking/state/render/AGNES logic stays in Tasks 1–6 modules.
- `popstate` reconstructs from `window.location.search`; navigation uses `history.pushState` without server routes.

- [ ] **Step 1: Write failing app integration tests**

Pin imports for all new modules; URL handling for Explore, Destinations, Experiences, About, `?view=cruises&port=limassol`, mode collections and `?journey=...`; journey/mode/region/feeling/port/filter event hooks; operational-layer close/back; AGNES form/actions; image fallback wiring.

Add unknown journey ID orchestration test: return Explore with clear not-found message, not throw. Update old app regression assertions so they do not require legacy dashboard views; keep `travel-ranking.test.mjs` unchanged.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-world-integration.test.mjs tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs`

Expected: FAIL until `app.js` is migrated.

- [ ] **Step 3: Rewrite `app.js` as orchestration layer**

Remove legacy dashboard as default visible experience. Initial mount uses parsed URL state + browser month. Wire full global nav, Travel by menu, experience collections, mode/contextual filters, cruise ports/filters, journey cards, operational layers, AGNES, back/close actions and `popstate`.

- [ ] **Step 4: Update `index.html`**

Use global AGNES metadata, replace hard-coded legacy nav with a minimal shell the cinematic renderer owns, include `cinematic.css`, retain module entry point, and use dark theme color.

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
- `cinematic.css` owns all `.agnes-world-*`, `.journey-*`, `.cruise-*`, `.agnes-dock-*`, collection/filter and operational-layer styling.
- `styles.css` may retain compatibility styles but cannot override visible AGNES World dark tokens.

- [ ] **Step 1: Write failing design-system tests**

Assert dark foundation, cream/gold accents, editorial display typography, full-bleed hero, cinematic overlays, global navigation, mode/region/experience collections, contextual filter controls, journey chapters, cruise departure rail, AGNES dock, operational layer, visible `:focus-visible`, mobile safe-area padding and image fallbacks.

Assert reduced-motion and `900px`/`640px` breakpoints, `env(safe-area-inset-bottom)`, and guard that the world shell does not use the old `#eef5ff` / blue-purple dashboard background.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/travel-cinematic-styles.test.mjs`

Expected: FAIL because `cinematic.css` does not exist.

- [ ] **Step 3: Implement `cinematic.css`**

Use one token layer. Desktop is immersive/wide; mobile uses normal document flow, horizontal collection rails where useful, full-screen/sheet operational detail, and AGNES dock spacing that never covers final CTA. Reduced-motion disables snap/animated transitions and smooth-scroll assumptions.

- [ ] **Step 4: Reduce conflicting legacy base styles**

Keep `styles.css` only for compatibility required by retained utilities. Remove/global-scope rules that force bright backgrounds/header chrome onto AGNES World.

- [ ] **Step 5: Run style and render tests**

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

- [ ] **Step 1: Run complete Travel-focused suite**

```bash
npx vitest run tests/travel-journeys-data.test.mjs tests/travel-seasonality.test.mjs tests/travel-journey-state.test.mjs tests/travel-agnes-world.test.mjs tests/travel-cinematic-render.test.mjs tests/travel-cruise-render.test.mjs tests/travel-world-assets.test.mjs tests/travel-world-integration.test.mjs tests/travel-cinematic-styles.test.mjs tests/travel-ranking.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run repository verification**

Run: `npm run check`

Expected: lint, TypeScript build and full Vitest suite PASS.

Run: `npm run format:check`

Expected: PASS.

- [ ] **Step 3: Browser QA desktop, tablet and narrow mobile**

Verify:
1. Explore loads as AGNES World and shows all four travel modes.
2. Right Now follows current month.
3. Destinations, Experiences and About AGNES are complete, dark cinematic screens rather than placeholders.
4. Road filters expose month/region/duration/road-vs-caravan; Rail exposes month/region/duration/scenic-sleeper-city; empty results recover cleanly.
5. Cruises opens with Departing from first; Limassol selection works; month/destination/style/duration filters work.
6. Cruise card → cinematic detail → route/chapters → operational layer → AGNES → inquiry works.
7. Road/Rail/Air use the same generic detail architecture.
8. Browser back/forward reconstructs URL state.
9. Missing-image fallback is readable.
10. Keyboard reaches nav, filters, cards, overlay close and AGNES.
11. Reduced-motion has no mandatory animated/snap interaction.
12. No accidental horizontal body overflow and AGNES dock never covers final inquiry CTA.

- [ ] **Step 4: Run truthfulness copy audit**

```bash
rg -n "AGNES Live|best price guarantee|24/7 support|free cancellation|confirmed availability|Pay now" docs/travel
```

Expected: no production-visible unsupported claim; negative test fixtures are allowed.

- [ ] **Step 5: Compare branch scope**

Review `main...feature/agnes-world-redesign`: changes are limited to approved spec/plan, Travel frontend/tests and required media; no unrelated Core changes.

- [ ] **Step 6: Commit verification-only fixes if required**

```bash
git add docs/travel tests
git commit -m "fix(travel): complete AGNES World verification"
```

Only commit if fixes were required.

---

## Completion Definition

Complete means one coherent AGNES product, never the old dashboard aesthetic:

**Explore the world → choose Air / Sea / Rail / Road, Destinations, Experiences or seasonal collection → apply mode-appropriate filters → open a curated journey → experience three signature moments and route → reveal practical detail only when wanted → ask AGNES for deterministic personalisation → reach a truthful inquiry/planning action.**

Cruises specifically:

**Cruises → Departing from → Month / destination / style / duration → seasonally ranked journeys → cinematic cruise detail → route / ship / operational detail → AGNES → inquiry.**
