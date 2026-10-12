# Greece Road Trip Experience — Zagorochoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready cinematic AGNES Travel road-trip detail for Zagorochoria, with a complete departure-to-return itinerary, interactive trip preferences, and a deterministic AGNES copilot inside the existing GitHub Pages Travel site.

**Architecture:** Keep the existing static `docs/travel` application and GitHub Pages deployment. Extract the flagship trip content, trip-state transitions, AGNES intent handling, and road-trip rendering into focused ES modules; keep `app.js` responsible for top-level navigation and mounting. The first release is deterministic and state-driven, with a clean adapter boundary for a future live AGNES endpoint.

**Tech Stack:** HTML5, CSS, browser-native ES modules, Node.js 24, Vitest 3, existing GitHub Pages workflow.

**Spec:** `docs/superpowers/specs/2026-10-12-greece-road-trip-experience-design.md`

## Global Constraints

- Preserve the existing static GitHub Pages architecture under `docs/travel`; do not introduce React, Vue, another SPA framework, or a new build pipeline.
- Preserve existing Travel views: home, destinations, map, prices, compare, and ready trips.
- Road-trip detail order is fixed: Hero → Signature Moments → Trip Style → Route Overview → Day-by-Day Itinerary → AGNES personalization → Booking Summary.
- Exactly three signature moments appear before planning controls.
- The itinerary covers departure through return, not only destination days.
- AGNES first-release behavior is deterministic and trip-aware; do not label the assistant `AGNES Live` until a real assistant endpoint is configured and reachable.
- Unsupported AGNES requests must return a transparent bounded-capabilities response and must not fabricate travel information.
- Pricing, weather, flight, stay, and route facts that are not backed by a live source must be visibly framed as indicative/editorial.
- Destination photography must be specific to Zagori / Epirus / Meteora, stored locally under `docs/travel/assets/zagori/`, with source/credit metadata in trip data; do not hotlink unapproved third-party images.
- Missing images must degrade gracefully without hiding essential text.
- Responsive behavior must support desktop, tablet, and mobile without accidental horizontal page overflow.
- Existing GitHub Pages deployment remains `.github/workflows/travel-pages.yml`; do not create a second deployment workflow.

## Review Focus

1. **Unknown or mixed-language AGNES input:** the page must preserve state and return the supported-capabilities reply rather than guessing; pinned in Task 2 tests.
2. **Invalid trip-state patches:** duration/style/audience values outside the supported set must be rejected without corrupting the prior valid state; pinned in Task 2 tests.
3. **Incomplete or missing trip media:** renderer must keep readable copy and apply an image fallback class/placeholder; pinned in Task 3 tests.
4. **Legacy navigation regression:** non-road-trip views and generic destination detail must still render after the new modules are introduced; pinned in Task 5 tests.
5. **Responsive/overlay collision:** AGNES dock must not cover the booking CTA or itinerary content on narrow screens; pinned by Task 6 manual viewport verification and CSS assertions where practical.

---

## File Structure

### Create

- `docs/travel/trip-data.js` — canonical Zagorochoria road-trip content and asset metadata.
- `docs/travel/trip-state.js` — default state, validation, state patches, and itinerary derivation helpers.
- `docs/travel/agnes-trip.js` — deterministic AGNES intent parser and `handleAgnesMessage()` adapter.
- `docs/travel/road-trip-render.js` — pure HTML rendering functions for hero, moments, styles, route, itinerary, booking summary, and AGNES dock.
- `tests/travel-trip-data.test.mjs` — trip-data contract tests.
- `tests/travel-trip-state.test.mjs` — state and itinerary transformation tests.
- `tests/travel-agnes.test.mjs` — AGNES intent and fallback tests.
- `tests/travel-road-trip-render.test.mjs` — pure renderer output tests.
- `tests/travel-app-regression.test.mjs` — lightweight regression checks for existing Travel navigation/detail entry points.
- `docs/travel/assets/zagori/credits.json` — local image filenames, source URLs, creator/source labels, and license/use notes.
- `docs/travel/assets/zagori/*` — curated road-trip images used by hero, signature moments, route/day cards, and stays.

### Modify

- `docs/travel/app.js` — mount the road-trip detail, expose a featured/Ready Trips entry, hold active `tripState`, wire controls and AGNES actions, preserve existing views.
- `docs/travel/styles.css` — add isolated cinematic road-trip design tokens/components and responsive behavior without breaking utility screens.
- `docs/travel/index.html` — add only structural/meta hooks required by the new experience; keep the existing module entry point.
- `tests/travel-ranking.test.mjs` — only if needed to pin unchanged legacy ranking behavior after integration.

---

### Task 1: Define the Zagorochoria Trip Data Contract

**Files:**
- Create: `docs/travel/trip-data.js`
- Create: `tests/travel-trip-data.test.mjs`

**Interfaces:**
- Produces: `ZAGORI_TRIP` object and `getRoadTripById(id)`.
- `ZAGORI_TRIP.id` is exactly `'zagori-autumn'`.
- `ZAGORI_TRIP.signatureMoments` contains exactly 3 items in the order Vikos Gorge, Zagori→Metsovo drive, Meteora light/mist moment.
- `ZAGORI_TRIP.itinerary` contains departure, Day 1–5, and return chapters with unique stable IDs.
- Asset references are relative local paths under `assets/zagori/` and each referenced image has credit/source metadata.

- [ ] **Step 1: Write the failing trip-data tests**

Add tests asserting:

```js
expect(ZAGORI_TRIP.id).toBe('zagori-autumn');
expect(ZAGORI_TRIP.signatureMoments).toHaveLength(3);
expect(ZAGORI_TRIP.itinerary[0].kind).toBe('departure');
expect(ZAGORI_TRIP.itinerary.at(-1).kind).toBe('return');
expect(new Set(ZAGORI_TRIP.itinerary.map((day) => day.id)).size).toBe(ZAGORI_TRIP.itinerary.length);
expect(getRoadTripById('zagori-autumn')).toBe(ZAGORI_TRIP);
expect(getRoadTripById('missing')).toBeNull();
```

Also assert that all required hero fields, route stops, stay records, indicative-pricing labels, AGNES suggestion rules, and image credit fields are present.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run tests/travel-trip-data.test.mjs`

Expected: FAIL because `trip-data.js` and exports do not exist.

- [ ] **Step 3: Implement `trip-data.js`**

Export:

```js
export const ZAGORI_TRIP = { /* data only */ };
export function getRoadTripById(id) { /* exact-id lookup */ }
```

Use the approved Greek editorial copy from the spec. Keep all route/pricing/weather values marked as indicative/editorial in the data model where they are not backed by a live API.

- [ ] **Step 4: Run the focused test and verify pass**

Run: `npx vitest run tests/travel-trip-data.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/trip-data.js tests/travel-trip-data.test.mjs
git commit -m "feat(travel): add Zagori road trip data"
```

---

### Task 2: Add Trip State and Deterministic AGNES Actions

**Files:**
- Create: `docs/travel/trip-state.js`
- Create: `docs/travel/agnes-trip.js`
- Create: `tests/travel-trip-state.test.mjs`
- Create: `tests/travel-agnes.test.mjs`

**Interfaces:**
- Consumes: `ZAGORI_TRIP` from Task 1.
- Produces from `trip-state.js`:
  - `createTripState(tripId = 'zagori-autumn')`
  - `applyTripStatePatch(state, patch)` returning a new validated state
  - `deriveVisibleItinerary(trip, state)`
- Produces from `agnes-trip.js`:
  - `handleAgnesMessage(message, trip, state) -> { reply, statePatch, focusTarget }`
- Supported state values:
  - `style`: `classic | suv | boutique | nature`
  - `duration`: `4 | 5`
  - `audience`: `couple | family`
  - `drivingPace`: `balanced | relaxed`
  - `stayTier`: `boutique | premium`
  - `weatherMode`: `normal | rain`

- [ ] **Step 1: Write failing state tests**

Pin the default state exactly:

```js
expect(createTripState()).toMatchObject({
  tripId: 'zagori-autumn',
  style: 'classic',
  duration: 5,
  audience: 'couple',
  drivingPace: 'balanced',
  stayTier: 'boutique',
  weatherMode: 'normal',
  selectedDay: 'departure',
});
```

Add tests proving:

- duration `4` derives a valid shortened itinerary that still includes departure and return;
- `drivingPace: 'relaxed'` changes the intended route/itinerary presentation without mutating the source trip;
- invalid values such as duration `9` or style `'spaceship'` are ignored/rejected and previous valid state is preserved.

- [ ] **Step 2: Run state tests and verify failure**

Run: `npx vitest run tests/travel-trip-state.test.mjs`

Expected: FAIL because module/functions do not exist.

- [ ] **Step 3: Implement `trip-state.js`**

Use immutable updates. `applyTripStatePatch()` must whitelist keys and allowed values; invalid patches return the prior valid state value for that field. `deriveVisibleItinerary()` must never omit departure or return.

- [ ] **Step 4: Run state tests and verify pass**

Run: `npx vitest run tests/travel-trip-state.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing AGNES tests**

Assert recognized Greek/English phrases produce these state patches:

```js
"Κάν’ το 4ήμερο"              -> { duration: 4 }
"Θέλω λιγότερη οδήγηση"       -> { drivingPace: 'relaxed' }
"Κάν’ το πιο romantic"        -> { audience: 'couple' }
"Θέλω καλύτερα ξενοδοχεία"    -> { stayTier: 'premium' }
"Προσαρμογή για παιδιά"       -> { audience: 'family' }
"Τι αλλάζεις αν βρέχει;"      -> { weatherMode: 'rain' }
```

Also assert that an unknown or mixed-language request returns a bounded capabilities reply, an empty patch, and does not mutate `state`.

- [ ] **Step 6: Run AGNES tests and verify failure**

Run: `npx vitest run tests/travel-agnes.test.mjs`

Expected: FAIL because `agnes-trip.js` does not exist.

- [ ] **Step 7: Implement `agnes-trip.js`**

Implement only the supported deterministic intents plus bounded fallback. Normalize case, accents/apostrophes where needed, and common Greek/English variants. Do not add network calls or claim live AI behavior.

- [ ] **Step 8: Run Task 2 tests and verify pass**

Run: `npx vitest run tests/travel-trip-state.test.mjs tests/travel-agnes.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add docs/travel/trip-state.js docs/travel/agnes-trip.js tests/travel-trip-state.test.mjs tests/travel-agnes.test.mjs
git commit -m "feat(travel): add trip state and AGNES actions"
```

---

### Task 3: Build Pure Road-Trip Renderers

**Files:**
- Create: `docs/travel/road-trip-render.js`
- Create: `tests/travel-road-trip-render.test.mjs`

**Interfaces:**
- Consumes: trip object from Task 1 and state/derived itinerary from Task 2.
- Produces:
  - `renderTripHero(trip, state)`
  - `renderSignatureMoments(trip)`
  - `renderTripStyles(trip, state)`
  - `renderRouteOverview(trip, state)`
  - `renderItinerary(trip, state)`
  - `renderBookingSummary(trip, state)`
  - `renderAgnesDock(trip, state)`
  - `renderRoadTripDetail(trip, state)`
- All renderers return HTML strings and do not directly query or mutate `document`.

- [ ] **Step 1: Write failing renderer tests**

Assert `renderRoadTripDetail()` output contains:

- `ΖΑΓΟΡΟΧΩΡΙΑ` and `ΦΘΙΝΟΠΩΡΟ`;
- primary CTA `ΖΗΣΕ ΑΥΤΟ ΤΟ ROAD TRIP`;
- exactly three signature-moment elements identified by a stable `data-signature-moment` attribute;
- route section markers for Ioannina, Zagorochoria, Metsovo, and Meteora;
- departure and return itinerary chapters;
- AGNES dock label as `AGNES`, not `AGNES Live`;
- booking CTA `ΚΛΕΙΣΕ ΤΟ ROAD TRIP`.

Add an image-fallback test that passes a trip copy with a missing/empty image path and asserts the renderer still outputs the title/copy plus a fallback class/data attribute.

- [ ] **Step 2: Run renderer tests and verify failure**

Run: `npx vitest run tests/travel-road-trip-render.test.mjs`

Expected: FAIL because render module does not exist.

- [ ] **Step 3: Implement `road-trip-render.js`**

Keep section functions focused. Escape free-text AGNES history entries before inserting them into HTML. Add stable `data-*` hooks for style choices, day tabs, quick actions, AGNES input/send, route section, and booking CTA so `app.js` can wire behavior without parsing presentation text.

- [ ] **Step 4: Run renderer tests and verify pass**

Run: `npx vitest run tests/travel-road-trip-render.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/travel/road-trip-render.js tests/travel-road-trip-render.test.mjs
git commit -m "feat(travel): render cinematic road trip detail"
```

---

### Task 4: Curate and Add Destination-Specific Local Photography

**Files:**
- Create: `docs/travel/assets/zagori/credits.json`
- Create: `docs/travel/assets/zagori/*`
- Modify: `docs/travel/trip-data.js`
- Modify: `tests/travel-trip-data.test.mjs`

**Interfaces:**
- Consumes: asset slots defined in Task 1.
- Produces: local, credited imagery for hero, Vikos, Zagori→Metsovo drive, Meteora, itinerary chapters, and stay cards.

- [ ] **Step 1: Extend failing data tests for assets**

Assert every `image` path referenced by `ZAGORI_TRIP` begins with `assets/zagori/`, has a corresponding credit entry keyed by filename, and no `http://` or `https://` image URL is used as the rendered asset path.

- [ ] **Step 2: Run asset-contract test and verify failure**

Run: `npx vitest run tests/travel-trip-data.test.mjs`

Expected: FAIL until local asset paths and credits are complete.

- [ ] **Step 3: Curate imagery and validate provenance**

Use destination-specific images for Zagorochoria/Epirus/Meteora. Before adding each asset, record source URL, creator/source label, and license/use note in `credits.json`. Do not use generic Alpine/Dolomites placeholders.

- [ ] **Step 4: Add optimized local assets and update data paths**

Use web-friendly JPG/WebP dimensions appropriate to their slot; avoid unnecessarily large source files. Update `trip-data.js` to reference only the local paths.

- [ ] **Step 5: Run asset-contract test and verify pass**

Run: `npx vitest run tests/travel-trip-data.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/assets/zagori docs/travel/trip-data.js tests/travel-trip-data.test.mjs
git commit -m "feat(travel): add Zagori destination photography"
```

---

### Task 5: Integrate the Road Trip Into Existing Travel Navigation

**Files:**
- Modify: `docs/travel/app.js`
- Modify: `docs/travel/index.html`
- Create: `tests/travel-app-regression.test.mjs`
- Optional modify: `tests/travel-ranking.test.mjs`

**Interfaces:**
- Consumes: `getRoadTripById`, trip state helpers, AGNES handler, and `renderRoadTripDetail`.
- Produces: a clickable featured/Ready Trips entry for `zagori-autumn`; stateful road-trip mounting and interaction wiring.

- [ ] **Step 1: Write failing integration/regression tests**

Because browser DOM emulation is intentionally not added, test the static integration contract by reading `docs/travel/app.js` and `index.html` as text plus importing pure modules. Assert:

- `app.js` imports the new trip modules;
- it exposes/mounts the `zagori-autumn` trip from a featured or Ready Trips entry;
- existing view names `home`, `destinations`, `map`, `prices`, `compare`, `ready` remain present;
- existing ranking module import remains present;
- `index.html` still loads `app.js` as a module.

Keep the existing `travel-ranking.test.mjs` passing unchanged.

- [ ] **Step 2: Run regression tests and verify failure**

Run: `npx vitest run tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs`

Expected: new regression test FAILS before integration; legacy ranking tests PASS.

- [ ] **Step 3: Refactor `app.js` around a road-trip mount path**

Add a `state.roadTripId` (or equivalent explicit mode) and a single road-trip render/wire function. Keep current utility view functions intact except for the minimum entry-point change. Do not expand the legacy `detail()` into the new experience.

- [ ] **Step 4: Wire user interactions**

On road-trip mode:

- style card click → validated state patch → rerender;
- day selector → `selectedDay` update → rerender/scroll target;
- AGNES quick action → `handleAgnesMessage()` → patch state → append reply/history → rerender;
- AGNES free-text submit → same adapter path;
- booking CTA → non-payment next-step/inquiry state, clearly labeled.

- [ ] **Step 5: Run integration and ranking tests**

Run: `npx vitest run tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs tests/travel-trip-data.test.mjs tests/travel-trip-state.test.mjs tests/travel-agnes.test.mjs tests/travel-road-trip-render.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/travel/app.js docs/travel/index.html tests/travel-app-regression.test.mjs tests/travel-ranking.test.mjs
git commit -m "feat(travel): integrate Zagori flagship road trip"
```

---

### Task 6: Apply the Cinematic UI Design System and Responsive Behavior

**Files:**
- Modify: `docs/travel/styles.css`
- Modify: `docs/travel/road-trip-render.js` only if semantic class hooks are missing.
- Modify: `tests/travel-road-trip-render.test.mjs` only to pin required semantic hooks.

**Interfaces:**
- Consumes: stable road-trip class/data hooks from Task 3.
- Produces: isolated `.road-trip-*` styles that do not restyle legacy utility screens globally.

- [ ] **Step 1: Add failing semantic-hook assertions where needed**

Require stable classes/hooks for:

- hero overlay and hero facts;
- three-moment grid;
- trip-style selected state;
- route visualization;
- itinerary chapter/timeline/stay card;
- AGNES dock;
- booking summary.

- [ ] **Step 2: Run renderer test and verify any new assertion fails**

Run: `npx vitest run tests/travel-road-trip-render.test.mjs`

Expected: FAIL only for missing semantic hooks introduced by this task.

- [ ] **Step 3: Add isolated road-trip CSS**

Implement the approved visual language: photography-led hero, warm cream/parchment surfaces, near-black editorial text, restrained gold CTA/active accent, serif display headings, sans-serif utilities, rounded cards, subtle shadows, and generous spacing. Use CSS custom properties scoped to `.road-trip` where practical.

- [ ] **Step 4: Add responsive behavior**

Desktop: 3-column signature moments, wide route, image/timeline/stay itinerary composition.

Tablet/mobile: stacked signature moments, horizontal-snap trip styles, simplified/scrollable route, one-column itinerary, sticky/reachable AGNES dock with bottom spacing so content and booking CTA are never obscured.

- [ ] **Step 5: Run renderer and full automated suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Manual viewport verification**

Serve `docs/travel` locally and verify at representative widths: 1440px, 1024px, 768px, and 390px.

At each width verify:

- no accidental horizontal page overflow;
- hero copy remains readable over image;
- exactly three signature moments precede trip controls;
- route and day navigation remain usable;
- AGNES dock does not cover itinerary controls or booking CTA;
- keyboard focus is visible on buttons, chips, input, and CTA.

- [ ] **Step 7: Commit**

```bash
git add docs/travel/styles.css docs/travel/road-trip-render.js tests/travel-road-trip-render.test.mjs
git commit -m "feat(travel): style cinematic Zagori experience"
```

---

### Task 7: Final Verification, Documentation, and Production Handoff

**Files:**
- Modify only files required by verification fixes.
- No new deployment workflow.

**Interfaces:**
- Consumes: complete Tasks 1–6.
- Produces: a verified feature branch ready for review/merge to `main`; merge to `main` triggers the existing GitHub Pages deployment.

- [ ] **Step 1: Run formatting check**

Run: `npm run format:check`

Expected: PASS. If it fails, format only touched files and rerun.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run TypeScript build**

Run: `npm run build`

Expected: PASS; the static Travel modules must not break repository build tooling.

- [ ] **Step 4: Run complete test suite**

Run: `npm test`

Expected: PASS, including all existing Core and Travel tests plus the new road-trip tests.

- [ ] **Step 5: Run the repository aggregate check**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 6: Inspect the final diff against the approved spec**

Confirm:

- no `AGNES Live` label exists in the deterministic release;
- no payment behavior is implied;
- no remote image hotlinks are used for rendered trip photography;
- legacy Travel views remain available;
- road-trip page follows the fixed emotional-before-planning order;
- full itinerary includes departure and return.

- [ ] **Step 7: Commit any verification-only fixes**

```bash
git add <only-fixed-files>
git commit -m "fix(travel): finalize Zagori road trip verification"
```

Skip this commit if verification required no changes.

- [ ] **Step 8: Open a pull request to `main`**

PR title: `feat(travel): add cinematic Zagorochoria road trip`

PR body must summarize:

- new flagship experience;
- AGNES deterministic capabilities and explicit non-live limitation;
- preservation of legacy Travel views;
- automated checks run;
- manual desktop/mobile verification;
- deployment behavior: merging to `main` triggers existing `travel-pages.yml` GitHub Pages workflow.

- [ ] **Step 9: Verify deployment after merge**

After merge, inspect the GitHub Pages workflow for the merge commit and confirm the deployment job succeeds. Then open the deployed Travel URL and smoke-test the Zagorochoria entry, AGNES quick actions, 4-day mode, family/premium toggles, and return-to-navigation behavior.
