# AGNES World V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve AGNES World from a curated static travel showcase into a scalable dark-cinematic travel discovery and planning platform with normalized global content, faceted search, saved/compare flows, mode-specific planning, truthful provider boundaries, and AGNES Planner V2.

**Architecture:** Keep the existing build-free ES-module/GitHub Pages architecture, but split catalog, search, ranking, persistence, mode-specific renderers, provider boundaries, and planner logic into focused pure modules. The browser remains the orchestration layer; all live-commerce functionality is adapter-gated and falls back to editorial planning until a verified provider exists.

**Tech Stack:** Vanilla ES modules, HTML, CSS, browser `localStorage`, SVG/DOM route rendering, Vitest, ESLint, Prettier, GitHub Pages, Node 24 CI.

**Spec:** `docs/superpowers/specs/2026-10-12-agnes-world-v2-design.md`

## Global Constraints

- Preserve the existing dark cinematic AGNES visual system; no wholesale visual redesign.
- Keep GitHub Pages compatibility; no server-only routing or framework migration.
- Runtime month is the default; explicit selected month overrides it.
- Do not infer precise location silently; origin is explicit user state only.
- Never present editorial data as live provider data.
- Never claim verified price, availability, booking, confirmation, or live AI behavior without a connected provider/model endpoint.
- Preserve first-class travel modes: `air`, `sea`, `rail`, `road`.
- Saved state is local-only in V2; no account/auth dependency.
- Provider failures must degrade to editorial planning instead of breaking discovery.
- All search/ranking/planner functions must be deterministic and independently testable.

## Review Focus

- Corrupt or old `localStorage` payloads must fail closed and reset safely instead of breaking app startup; pin in Task 5.
- Unknown URL query values must be ignored or normalized without losing valid state; pin in Task 8.
- Search with empty query plus filters must behave as faceted browse, not return an empty screen; pin in Task 3.
- Provider adapter errors/timeouts must return a safe editorial fallback state with provenance preserved; pin in Task 7.
- Missing coordinates or route geometry must render a usable text/DOM route fallback instead of a broken map; pin in Task 6.

---

## File Structure

### New catalog modules

- `docs/travel/data/index.js` — aggregate normalized destinations, origins, journeys, operators.
- `docs/travel/data/destinations/*.js` — destination records by region.
- `docs/travel/data/journeys/*.js` — journey records by region.
- `docs/travel/data/origins/airports.js` — airport origins.
- `docs/travel/data/origins/ports.js` — cruise departure ports.
- `docs/travel/data/origins/stations.js` — rail stations.
- `docs/travel/data/origins/road-origins.js` — road origins.
- `docs/travel/data/providers/operators.js` — verified editorial operator references only.

### New platform modules

- `docs/travel/catalog.js` — normalize and validate catalog records.
- `docs/travel/search-index.js` — deterministic text/facet search.
- `docs/travel/ranking-v2.js` — V2 weighted ranking.
- `docs/travel/search-render.js` — search UI and filter result rendering.
- `docs/travel/saved-journeys.js` — versioned local persistence and compare shortlist.
- `docs/travel/map-render.js` — SVG/DOM route visualization with fallback.
- `docs/travel/rail-render.js` — rail-specific collection/detail content.
- `docs/travel/road-render.js` — road-specific collection/detail content.
- `docs/travel/air-render.js` — air-specific collection/detail content.
- `docs/travel/provider-gateway.js` — provider adapter boundary and safe fallback.
- `docs/travel/agnes-planner-v2.js` — deterministic planner intents and ranked output.

### Existing files to modify

- `docs/travel/app.js` — V2 state orchestration and view routing only.
- `docs/travel/journey-state.js` — V2 URL/state schema.
- `docs/travel/journeys-data.js` — compatibility facade over new catalog.
- `docs/travel/seasonality.js` — reusable V2 season scoring helpers.
- `docs/travel/cinematic-render.js` — global search entry, Saved navigation, detail composition hooks.
- `docs/travel/cruise-render.js` — normalized port/provider-aware cruise flow.
- `docs/travel/agnes-journey.js` — compatibility wrapper toward planner V2.
- `docs/travel/cinematic.css` — search/filter/saved/compare/map/mode-specific V2 styles.
- `docs/travel/index.html` — only if V2 shell metadata/semantic hooks are required.

---

### Task 1: Normalized V2 Catalog Foundation

**Files:**
- Create: `docs/travel/catalog.js`
- Create: `docs/travel/data/index.js`
- Create: `docs/travel/data/destinations/europe.js`
- Create: `docs/travel/data/destinations/asia.js`
- Create: `docs/travel/data/destinations/africa.js`
- Create: `docs/travel/data/destinations/north-america.js`
- Create: `docs/travel/data/destinations/south-america.js`
- Create: `docs/travel/data/destinations/oceania.js`
- Create: `docs/travel/data/journeys/greece.js`
- Create: `docs/travel/data/journeys/europe.js`
- Create: `docs/travel/data/journeys/asia.js`
- Create: `docs/travel/data/journeys/africa.js`
- Create: `docs/travel/data/journeys/north-america.js`
- Create: `docs/travel/data/journeys/south-america.js`
- Create: `docs/travel/data/journeys/oceania.js`
- Create: `docs/travel/data/origins/airports.js`
- Create: `docs/travel/data/origins/ports.js`
- Create: `docs/travel/data/origins/stations.js`
- Create: `docs/travel/data/origins/road-origins.js`
- Create: `docs/travel/data/providers/operators.js`
- Modify: `docs/travel/journeys-data.js`
- Test: `tests/travel-v2-catalog.test.mjs`

**Interfaces:**
- Consumes: existing V1 journey data and region semantics.
- Produces: `createCatalog({ destinations, origins, journeys, operators })`, `CATALOG`, `getJourney(id)`, `getDestination(id)`, `getOrigin(id)`, `getJourneysByMode(mode)`.

- [ ] **Step 1: Write the failing catalog normalization tests**

Assert that catalog creation rejects duplicate IDs, exposes all four travel modes, resolves destination/origin references, and preserves current Greece/world journeys.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/travel-v2-catalog.test.mjs`
Expected: FAIL because `catalog.js` and normalized data modules do not exist.

- [ ] **Step 3: Implement the normalized catalog and compatibility facade**

Create pure lookup maps internally; keep public records immutable-by-convention and browser-safe. `journeys-data.js` must continue exporting `JOURNEYS` and `getJourneyById()` so V1 renderers remain functional during migration.

- [ ] **Step 4: Run catalog and existing travel data tests**

Run: `npx vitest run tests/travel-v2-catalog.test.mjs tests/travel-journeys-data.test.mjs tests/travel-world-catalog-depth.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/data docs/travel/catalog.js docs/travel/journeys-data.js tests/travel-v2-catalog.test.mjs
git commit -m "feat(travel): normalize AGNES World catalog"
```

### Task 2: V2 Seasonality and Ranking Engine

**Files:**
- Create: `docs/travel/ranking-v2.js`
- Modify: `docs/travel/seasonality.js`
- Test: `tests/travel-v2-ranking.test.mjs`

**Interfaces:**
- Consumes: `CATALOG.journeys`, normalized origin IDs, explicit search context.
- Produces: `scoreJourney(journey, context)`, `rankJourneys(journeys, context)`, `classifySeason(journey, month)`.

- [ ] **Step 1: Write failing weighted-ranking tests**

Pin ranking order for explicit month, mode, origin, duration, feeling/style, and editorial priority. Add cruise departure-port weighting and rail origin-station weighting. Assert no location score is applied when origin is absent.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-ranking.test.mjs`
Expected: FAIL because `ranking-v2.js` does not exist.

- [ ] **Step 3: Implement deterministic scoring**

Use named numeric weights exported as `RANKING_WEIGHTS`; explicit constraints must dominate editorial priority. Reuse season classification rather than duplicating month logic.

- [ ] **Step 4: Run ranking and seasonality tests**

Run: `npx vitest run tests/travel-v2-ranking.test.mjs tests/travel-seasonality.test.mjs tests/travel-ranking.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/ranking-v2.js docs/travel/seasonality.js tests/travel-v2-ranking.test.mjs
git commit -m "feat(travel): add V2 seasonal ranking engine"
```

### Task 3: Global Search and Faceted Discovery

**Files:**
- Create: `docs/travel/search-index.js`
- Create: `docs/travel/search-render.js`
- Modify: `docs/travel/cinematic-render.js`
- Test: `tests/travel-v2-search.test.mjs`

**Interfaces:**
- Consumes: `CATALOG`, `rankJourneys()`.
- Produces: `buildSearchIndex(catalog)`, `searchJourneys(index, query, filters)`, `renderSearchPage(results, state, facets)`.

- [ ] **Step 1: Write failing search tests**

Assert search across journey title, destination, country, region, origin, port, airport, station, feeling, style, and mode. Pin the Review Focus behavior: an empty query with filters returns matching browse results rather than `[]`.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-search.test.mjs`
Expected: FAIL because search modules do not exist.

- [ ] **Step 3: Implement normalized token search and facet filtering**

Search is case-insensitive, accent-tolerant through `String.prototype.normalize('NFD')`, and deterministic. Do not add fuzzy-search dependencies.

- [ ] **Step 4: Add cinematic global search entry and result renderer**

Expose a restrained search control in Explore; render results as editorial cards/rails with desktop sidebar and mobile filter-drawer hooks.

- [ ] **Step 5: Run search and cinematic renderer tests**

Run: `npx vitest run tests/travel-v2-search.test.mjs tests/travel-cinematic-render.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/search-index.js docs/travel/search-render.js docs/travel/cinematic-render.js tests/travel-v2-search.test.mjs
git commit -m "feat(travel): add global faceted search"
```

### Task 4: Mode-Specific Discovery Modules

**Files:**
- Create: `docs/travel/rail-render.js`
- Create: `docs/travel/road-render.js`
- Create: `docs/travel/air-render.js`
- Modify: `docs/travel/cruise-render.js`
- Test: `tests/travel-v2-modes.test.mjs`

**Interfaces:**
- Consumes: search/ranking APIs and normalized mode extensions.
- Produces: `renderRailLanding()`, `renderRailDetail()`, `renderRoadLanding()`, `renderRoadDetail()`, `renderAirLanding()`, `renderAirDetail()`; cruise renderer continues `renderCruiseLanding()` and `renderCruiseDetail()`.

- [ ] **Step 1: Write failing mode-specific tests**

Pin rail origin/service type, road driving intensity/camper filters, air origin/trip-length filters, and cruise departure-port/month filters.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-modes.test.mjs`
Expected: FAIL because rail/road/air V2 renderers do not exist.

- [ ] **Step 3: Implement mode-specific filtering and presentation**

Reuse shared journey cards and search/ranking logic; keep mode files focused on mode metadata and controls rather than duplicating global renderer code.

- [ ] **Step 4: Run mode and existing cruise tests**

Run: `npx vitest run tests/travel-v2-modes.test.mjs tests/travel-cruise-render.test.mjs tests/travel-americas-region.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/rail-render.js docs/travel/road-render.js docs/travel/air-render.js docs/travel/cruise-render.js tests/travel-v2-modes.test.mjs
git commit -m "feat(travel): add mode-specific V2 discovery"
```

### Task 5: Saved Journeys and Compare Shortlist

**Files:**
- Create: `docs/travel/saved-journeys.js`
- Create: `docs/travel/compare-render.js`
- Modify: `docs/travel/cinematic-render.js`
- Test: `tests/travel-v2-saved.test.mjs`

**Interfaces:**
- Consumes: journey IDs and catalog lookup.
- Produces: `loadSavedState(storage)`, `saveJourney(id, storage)`, `removeSavedJourney(id, storage)`, `toggleCompareJourney(id, storage)`, `getComparedJourneys(catalog, storage)`, `renderSavedPage()`.

- [ ] **Step 1: Write failing persistence tests**

Pin schema version, save/remove, maximum compare size of 3, reload behavior, and Review Focus behavior for corrupt JSON/old schema resetting safely.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-saved.test.mjs`
Expected: FAIL because persistence modules do not exist.

- [ ] **Step 3: Implement versioned browser-storage state**

Use storage key `agnes.world.saved.v2`. Functions receive a storage-like object so tests do not require a browser.

- [ ] **Step 4: Add saved/compare UI hooks**

Add Saved to navigation, journey save buttons, compare affordances, and a three-column maximum compare view that collapses cleanly on mobile.

- [ ] **Step 5: Run persistence and renderer tests**

Run: `npx vitest run tests/travel-v2-saved.test.mjs tests/travel-cinematic-render.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/saved-journeys.js docs/travel/compare-render.js docs/travel/cinematic-render.js tests/travel-v2-saved.test.mjs
git commit -m "feat(travel): add saved journeys and compare"
```

### Task 6: Interactive Route and Map Layer

**Files:**
- Create: `docs/travel/map-render.js`
- Modify: `docs/travel/cinematic-render.js`
- Modify: `docs/travel/cinematic.css`
- Test: `tests/travel-v2-map.test.mjs`

**Interfaces:**
- Consumes: journey route stops with optional coordinates.
- Produces: `buildRouteModel(journey)`, `renderJourneyMap(journey, options)`.

- [ ] **Step 1: Write failing map tests**

Assert ordered clickable stops, current-chapter highlight, SVG output when coordinates exist, and Review Focus fallback to accessible text/DOM route when coordinates are missing.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-map.test.mjs`
Expected: FAIL because `map-render.js` does not exist.

- [ ] **Step 3: Implement provider-free route visualization**

Use lightweight SVG geometry only; no mandatory third-party map SDK.

- [ ] **Step 4: Integrate map into journey detail and reduced-motion CSS**

Keep route usable without animation and preserve existing chapter flow.

- [ ] **Step 5: Run map/style tests**

Run: `npx vitest run tests/travel-v2-map.test.mjs tests/travel-cinematic-styles.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/map-render.js docs/travel/cinematic-render.js docs/travel/cinematic.css tests/travel-v2-map.test.mjs
git commit -m "feat(travel): add interactive route layer"
```

### Task 7: Provider Gateway and Truthful Commerce Boundary

**Files:**
- Create: `docs/travel/provider-gateway.js`
- Modify: `docs/travel/cruise-render.js`
- Modify: `docs/travel/rail-render.js`
- Modify: `docs/travel/air-render.js`
- Modify: `docs/travel/cinematic-render.js`
- Test: `tests/travel-v2-provider.test.mjs`

**Interfaces:**
- Consumes: provider adapter objects implementing supported methods.
- Produces: `createProviderGateway(adapters)`, `searchLiveOptions(kind, input)`, normalized `{ status, live, provider, fetchedAt, results, error }` responses.

- [ ] **Step 1: Write failing provider-boundary tests**

Assert verified provider results carry provenance, absent adapters return editorial fallback, and Review Focus provider exceptions return `{ status: 'fallback', live: false }` without throwing into UI.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-provider.test.mjs`
Expected: FAIL because provider gateway does not exist.

- [ ] **Step 3: Implement the adapter gateway**

Support method names `searchFlights`, `searchCruises`, `searchRail`, `searchStays`, `searchActivities`, `getAvailability`; do not create fake adapter implementations.

- [ ] **Step 4: Wire safe commerce CTAs into detail pages**

When no provider supports the action, render `Plan with AGNES` / `Request availability`; only render `Check live options` for a connected capability.

- [ ] **Step 5: Run provider and truthfulness regression tests**

Run: `npx vitest run tests/travel-v2-provider.test.mjs tests/travel-agnes-world.test.mjs tests/travel-cruise-render.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/provider-gateway.js docs/travel/cruise-render.js docs/travel/rail-render.js docs/travel/air-render.js docs/travel/cinematic-render.js tests/travel-v2-provider.test.mjs
git commit -m "feat(travel): add truthful provider gateway"
```

### Task 8: V2 URL State, Navigation, and Search Restoration

**Files:**
- Modify: `docs/travel/journey-state.js`
- Modify: `docs/travel/app.js`
- Test: `tests/travel-v2-state.test.mjs`

**Interfaces:**
- Consumes: search filters, saved view, compare view, mode/origin/month state.
- Produces: `createJourneyState(now)`, `parseJourneyState(search, now)`, `serializeJourneyState(state)`, `applyStatePatch(state, patch)`.

- [ ] **Step 1: Write failing V2 state tests**

Pin URLs for Explore, mode, cruises, journey, search, Saved and compare. Add Review Focus test: unknown `view`, invalid month, unknown mode, and unrelated query keys are normalized/ignored while valid fields survive.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-state.test.mjs`
Expected: FAIL because V2 state keys/views are unsupported.

- [ ] **Step 3: Extend static-host-safe state schema**

Add search query, country, duration range, origin, rail style, cruise style, road style, saved/compare view state. Preserve browser back/forward via `popstate` handling in `app.js`.

- [ ] **Step 4: Run state and app regression tests**

Run: `npx vitest run tests/travel-v2-state.test.mjs tests/travel-journey-state.test.mjs tests/travel-app-regression.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/journey-state.js docs/travel/app.js tests/travel-v2-state.test.mjs
git commit -m "feat(travel): extend V2 navigation state"
```

### Task 9: AGNES Planner V2

**Files:**
- Create: `docs/travel/agnes-planner-v2.js`
- Modify: `docs/travel/agnes-journey.js`
- Modify: `docs/travel/cinematic-render.js`
- Test: `tests/travel-v2-agnes-planner.test.mjs`

**Interfaces:**
- Consumes: `CATALOG`, `rankJourneys()`, current planning state.
- Produces: `planWithAgnes(message, context)` returning `{ statePatch, reply, matches, nextAction }`.

- [ ] **Step 1: Write failing planner-intent tests**

Pin deterministic parsing for: `7 days in October by sea`, `less driving`, `from Limassol`, `mountains by train`, `romantic and quiet`, `something warmer next month`, and `compare these two`. Assert unknown intents return no unsafe claims.

- [ ] **Step 2: Run focused test**

Run: `npx vitest run tests/travel-v2-agnes-planner.test.mjs`
Expected: FAIL because planner V2 does not exist.

- [ ] **Step 3: Implement structured deterministic planning**

Planner extracts only supported constraints, merges them into state, ranks matches, and explains what changed. No model/network call is introduced.

- [ ] **Step 4: Keep `agnes-journey.js` as compatibility wrapper**

Existing callers should delegate to Planner V2 where possible without breaking previous deterministic intents.

- [ ] **Step 5: Run planner and AGNES regression tests**

Run: `npx vitest run tests/travel-v2-agnes-planner.test.mjs tests/travel-agnes-world.test.mjs tests/travel-agnes.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/agnes-planner-v2.js docs/travel/agnes-journey.js docs/travel/cinematic-render.js tests/travel-v2-agnes-planner.test.mjs
git commit -m "feat(travel): add AGNES Planner V2"
```

### Task 10: App Orchestration and Complete V2 UI Integration

**Files:**
- Modify: `docs/travel/app.js`
- Modify: `docs/travel/cinematic-render.js`
- Modify: `docs/travel/cinematic.css`
- Modify: `docs/travel/index.html`
- Test: `tests/travel-v2-integration.test.mjs`

**Interfaces:**
- Consumes: all earlier task APIs.
- Produces: final browser navigation among Explore, Search, Destinations, Travel By, Experiences, Cruises, Saved, Compare, Journey, About, and AGNES planner interactions.

- [ ] **Step 1: Write failing end-to-end DOM-string integration tests**

Assert Explore has global search and four modes; Search restores filters; Saved and Compare are reachable; mode-specific views render; journey detail includes map and truthful commerce CTA; AGNES dock survives all views.

- [ ] **Step 2: Run focused integration test**

Run: `npx vitest run tests/travel-v2-integration.test.mjs`
Expected: FAIL because V2 orchestration is incomplete.

- [ ] **Step 3: Refactor `app.js` into orchestration only**

Centralize event delegation and view selection; renderer-specific markup remains outside `app.js`.

- [ ] **Step 4: Complete responsive V2 styling**

Add desktop filter sidebar, mobile filter drawer, Saved/Compare layouts, route/map states, mode controls, safe-area AGNES dock, and reduced-motion rules while retaining current palette/typography.

- [ ] **Step 5: Run integration, style, and smoke tests**

Run: `npx vitest run tests/travel-v2-integration.test.mjs tests/travel-cinematic-styles.test.mjs tests/travel-world-smoke.test.mjs tests/travel-world-integration.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/app.js docs/travel/cinematic-render.js docs/travel/cinematic.css docs/travel/index.html tests/travel-v2-integration.test.mjs
git commit -m "feat(travel): integrate AGNES World V2 experience"
```

### Task 11: Deep Content Expansion and Coverage Guardrails

**Files:**
- Modify: `docs/travel/data/destinations/*.js`
- Modify: `docs/travel/data/journeys/*.js`
- Modify: `docs/travel/data/origins/*.js`
- Test: `tests/travel-v2-content-coverage.test.mjs`

**Interfaces:**
- Consumes: normalized catalog schema from Task 1.
- Produces: a materially larger curated world catalog that requires no renderer changes to expand.

- [ ] **Step 1: Write failing content-coverage tests**

Require meaningful journey coverage across Greece, Europe, Asia, Africa, North America, South America and Oceania; require all four modes globally; require multiple departure ports/stations/airports/road origins; require every journey reference to resolve.

- [ ] **Step 2: Run focused coverage test**

Run: `npx vitest run tests/travel-v2-content-coverage.test.mjs`
Expected: FAIL until the deeper V2 dataset is populated.

- [ ] **Step 3: Expand catalog systematically by region and mode**

Preserve truthful editorial seasonality. Do not fabricate current prices, live schedules, ratings, reviews, availability, or provider confirmation.

- [ ] **Step 4: Run catalog, search, ranking, and coverage tests**

Run: `npx vitest run tests/travel-v2-content-coverage.test.mjs tests/travel-v2-catalog.test.mjs tests/travel-v2-search.test.mjs tests/travel-v2-ranking.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/data tests/travel-v2-content-coverage.test.mjs
git commit -m "feat(travel): expand V2 global content catalog"
```

### Task 12: Full Regression, Truthfulness Audit, and PR Readiness

**Files:**
- Modify only if verification exposes defects.
- Test: entire repository suite.

**Interfaces:**
- Consumes: completed V2 branch.
- Produces: merge-ready branch with evidence.

- [ ] **Step 1: Run full repository verification**

Run:

```bash
npm run lint
npm run build
npm test
npm run format:check
```

Expected: all commands exit 0.

- [ ] **Step 2: Run targeted Travel regression suite**

Run: `npx vitest run tests/travel-*.test.mjs`
Expected: all Travel tests pass.

- [ ] **Step 3: Audit unsupported commerce/AI claims**

Search Travel source for copy implying `confirmed`, `booked`, `live AI`, `best price`, or verified availability outside provider-gated states. Expected: no unsupported claims.

- [ ] **Step 4: Verify static-host compatibility**

Confirm no new route requires server rewrites and all assets/modules resolve relative to `docs/travel/`.

- [ ] **Step 5: Open/update PR with exact verification evidence**

PR body must list catalog/search/ranking/persistence/map/provider/planner coverage and the full CI result; keep it draft until CI is green.

---

## Self-Review Notes

- Spec coverage: catalog normalization, content expansion, search, ranking, seasonality, mode-specific flows, saved/compare, map, provider boundaries, truthful commerce, URL state, AGNES Planner V2, mobile/responsive integration and GitHub Pages compatibility are each assigned to explicit tasks.
- Interface consistency: catalog → ranking → search → mode renderers → saved/map/provider/planner → app integration is one-way and uses named exports defined in earlier tasks.
- Review Focus is covered explicitly in Tasks 3, 5, 6, 7 and 8.
- No mandatory external dependency was introduced for search, map, persistence or provider architecture.
- Real booking/payment and account authentication remain out of scope, as required by the spec.
