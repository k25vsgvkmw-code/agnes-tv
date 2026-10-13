# AGNES Travel Editorial Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the screenshot-based Explore homepage with a real, responsive editorial travel homepage that faithfully matches the approved reference while preserving existing AGNES routing, search, Saved, month state, journey pages, and planner behavior.

**Architecture:** Keep the existing `app.js` state/router and downstream journey pages intact. Move the approved homepage composition into a dedicated curated configuration, render it from `cinematic-render.js` as real DOM markup, style it in a focused editorial stylesheet, and remove the screenshot override from the Explore path. Destination media must be destination-specific and curated; catalog ranking must not change card position.

**Tech Stack:** Vanilla ES modules, HTML, CSS Grid/Flexbox, Vitest, existing AGNES app state/router.

**Spec:** `docs/superpowers/specs/2026-10-13-agnes-travel-editorial-homepage-design.md`

## Global Constraints

- The uploaded 1536×864 reference is authoritative for visual composition.
- Palette: warm ivory `#F7F4EF`, near-black `#171411`, rust `#AD4C27`.
- No dark/navy luxury styling, OTA layout, ecommerce card bodies, star ratings, fake reviews, fake discounts, fake scarcity, or fake live availability.
- Homepage card order and geometry are curated and must not be changed by catalog ranking.
- Do not use the approved screenshot as the rendered homepage background.
- Every destination must use its own correct image; no Zagori/Meteora stand-ins for unrelated destinations.
- No invented prices; without trusted provider data render `Σχεδίασέ το με AGNES`.
- Preserve existing routing, search, Saved, browser history, month state, destination detail pages, and AGNES planner.
- Mobile becomes a one-card-per-row cinematic flow in the exact specified order.

## Review Focus

- Missing or failed destination image: card remains readable and does not collapse layout.
- Non-October month state: month control remains functional without reordering the curated homepage.
- Search/Saved/Destinations/Experiences navigation: existing state transitions still work from the new header controls.
- Decorative “video/live” badges: never imply a real stream unless a real media source exists.
- Narrow/mobile viewport: no horizontal page overflow except the intentional month strip.

---

### Task 1: Curated Homepage Configuration

**Files:**
- Create: `docs/travel/homepage-curation.js`
- Modify: `tests/travel-cinematic-render.test.mjs`

**Interfaces:**
- Produces: `APPROVED_AUTUMN_HOME`, a frozen configuration object containing intro copy, active month, filters, and exactly ten card records with stable `role`, `journeyId`, `title`, `subtitle`, `location`, `image`, `objectPosition`, and optional `badge`.
- Consumes: existing journey IDs used by current routing.

- [ ] **Step 1: Write the failing configuration test**

Add assertions that the config contains exactly these positions and titles in order: Iceland hero, Tromsø tall, Alps wide, Switzerland narrow, Dolomites narrow, Lake Como, Plitvice, Zermatt, Amalfi, Lofoten; assert all ten image paths are non-empty and do not contain `/zagori/`.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run tests/travel-cinematic-render.test.mjs`
Expected: FAIL because `homepage-curation.js` / curated config does not yet exist.

- [ ] **Step 3: Implement `APPROVED_AUTUMN_HOME`**

Create the dedicated config with the exact Greek copy and roles from the spec. Use stable journey IDs that already resolve through the app router. Keep layout metadata in this file so `renderExploreHome()` does not sort or infer positions.

- [ ] **Step 4: Re-run the focused test**

Expected: PASS for the new config assertions.

- [ ] **Step 5: Commit**

Commit message: `feat: add curated editorial homepage config`

---

### Task 2: Real Editorial Explore Renderer

**Files:**
- Modify: `docs/travel/cinematic-render.js`
- Modify: `tests/travel-cinematic-render.test.mjs`

**Interfaces:**
- Consumes: `APPROVED_AUTUMN_HOME` from Task 1 and existing `state` / `data-*` routing conventions.
- Produces: `renderExploreHome(journeys, state)` with real semantic markup for month rail, intro, glass nav, filters, ten-card mosaic, and compact AGNES trigger/panel.

- [ ] **Step 1: Replace the existing ranking-based Explore tests with exact curated-render assertions**

Assert the renderer emits exactly ten `.editorial-destination-card` elements, one per configured title, with one `data-journey-id` each; assert the reference copy, month rail, search form, `data-nav-view="destinations"`, `data-nav-view="experiences"`, `data-nav-view="saved"`, and AGNES trigger are present. Assert `Προτεινόμενα ταξίδια` and the old recommendations section are absent.

- [ ] **Step 2: Add review-focus renderer tests**

Assert a non-October `state.month` changes the active month class but does not change the ten-card order. Assert decorative badge markup uses neutral labels without `aria-live` or fake live-state semantics.

- [ ] **Step 3: Run the renderer test and confirm failure**

Run: `npm test -- --run tests/travel-cinematic-render.test.mjs`
Expected: FAIL against the current ranking/recommendations renderer.

- [ ] **Step 4: Implement the curated Explore renderer**

Refactor only the Explore-specific helpers. Keep `renderGlobalHeader`, journey detail renderers, collection pages, and state interfaces stable. Use semantic buttons/articles and existing `data-journey-id`, `data-month-jump`, `data-global-search-form`, `data-nav-view`, and `data-agnes-*` hooks.

- [ ] **Step 5: Re-run renderer tests**

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: render approved editorial explore homepage`

---

### Task 3: Exact Editorial Styling and Responsive Composition

**Files:**
- Replace/reshape: `docs/travel/approved-autumn.css`
- Modify: `docs/travel/agnes-contextual.css` only where needed for the compact light AGNES trigger/panel
- Modify: `tests/travel-cinematic-styles.test.mjs`

**Interfaces:**
- Consumes: class names emitted by Task 2.
- Produces: desktop geometry matching the 1536×864 reference and mobile one-scene-at-a-time layout.

- [ ] **Step 1: Write failing style contract tests**

Assert the editorial stylesheet contains the exact palette values, a fixed/anchored month rail, 12-column editorial mosaic, explicit role selectors for hero/tall/wide/narrow/bottom cards, five-column bottom row behavior at desktop, and mobile breakpoint rules that collapse all destination cards to one column. Assert there is no dark page background and no old recommended-grid styling dependency.

- [ ] **Step 2: Add overflow/reduced-motion style assertions**

Assert mobile rules make only the month strip horizontally scrollable; assert `prefers-reduced-motion: reduce` disables card zoom/transform transitions.

- [ ] **Step 3: Run the style test and confirm failure**

Run: `npm test -- --run tests/travel-cinematic-styles.test.mjs`
Expected: FAIL because current styling does not match the locked composition.

- [ ] **Step 4: Implement desktop composition**

Match the reference proportions: ~7.5% rail, oversized intro title, upper-right Iceland hero, left Tromsø tall card, center Alps wide card, two narrow cards, five-card bottom row, narrow gutters, rounded photographic surfaces, subtle scrims, restrained glass controls.

- [ ] **Step 5: Implement mobile composition**

Use horizontal month strip, compact top controls, then full-width cards in this exact order: Iceland, Tromsø, Alps, Switzerland, Dolomites, Lake Como, Plitvice, Zermatt, Amalfi, Lofoten. Keep AGNES as a small floating circle until expanded.

- [ ] **Step 6: Re-run style tests**

Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `style: match approved AGNES editorial reference`

---

### Task 4: Remove Screenshot Override and Wire the Real Homepage

**Files:**
- Modify: `docs/travel/app-entry.js`
- Modify: `docs/travel/index.html`
- Delete or retire from runtime: `docs/travel/approved-home-override.js`
- Delete or retire from runtime: `docs/travel/approved-home.js`
- Remove runtime stylesheet link if obsolete: `docs/travel/approved-home.css`
- Modify: `tests/travel-app-regression.test.mjs`

**Interfaces:**
- Consumes: real `renderExploreHome()` from Task 2.
- Produces: application startup that renders Explore through the normal router with no post-render DOM replacement.

- [ ] **Step 1: Write failing regression assertions**

Assert `app-entry.js` no longer imports `approved-home-override.js`; assert `index.html` does not load obsolete screenshot-home CSS; assert the runtime source does not call `renderApprovedReferenceHome` or hydrate a base64 reference image.

- [ ] **Step 2: Run the regression test**

Run: `npm test -- --run tests/travel-app-regression.test.mjs`
Expected: FAIL while the override remains wired.

- [ ] **Step 3: Remove the override from startup**

Keep `journey-photo-bootstrap.js`, the required journey/catalog bootstrap, and `app.js`. Remove only the screenshot replacement path.

- [ ] **Step 4: Re-run regression tests**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `refactor: remove screenshot homepage override`

---

### Task 5: Destination-Specific Media Assets

**Files:**
- Create directory: `docs/travel/assets/editorial-home/`
- Add ten destination-specific image assets or approved static remote-backed equivalents following the repository's credit strategy
- Modify: `docs/travel/assets/world/photo-credits.json` or add `docs/travel/assets/editorial-home/credits.json`
- Modify: `docs/travel/homepage-curation.js`
- Add: `tests/travel-editorial-assets.test.mjs`

**Interfaces:**
- Consumes: image paths used by `APPROVED_AUTUMN_HOME`.
- Produces: ten distinct, correct, traceable media assets with stable production paths.

- [ ] **Step 1: Write the failing asset integrity test**

For every curated card, assert its asset path is unique, exists in the repository, and is not SVG placeholder content. Assert all ten have credit metadata where required.

- [ ] **Step 2: Run the asset test and confirm failure**

Run: `npm test -- --run tests/travel-editorial-assets.test.mjs`
Expected: FAIL until the approved assets are present.

- [ ] **Step 3: Add the ten correct destination images**

Required subjects: Iceland autumn waterfall, Tromsø aurora/fjord/town, autumn Alps lake/village, Swiss cable car/alpine snow, Dolomites autumn road, Lake Como, Plitvice lakes/walkway, Zermatt/Matterhorn, Amalfi Coast, Lofoten. Do not reuse the same image between destinations.

- [ ] **Step 4: Tune per-card crops in `homepage-curation.js`**

Set `objectPosition` values so focal points match the approved reference as closely as the selected assets allow.

- [ ] **Step 5: Re-run asset and renderer tests**

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `assets: add destination-specific editorial photography`

---

### Task 6: End-to-End Interaction and Final Verification

**Files:**
- Modify/add an existing travel E2E test under `tests/e2e/` if the project harness supports the static travel page directly; otherwise extend renderer/regression tests without introducing a new browser dependency.
- Modify: relevant tests only if a genuine integration defect is found.

**Interfaces:**
- Consumes: completed homepage, existing app router/state, existing AGNES planner.
- Produces: verified Explore flow with no regression to downstream views.

- [ ] **Step 1: Add interaction coverage**

Verify the ten destination cards carry routable journey IDs; search uses `data-global-search-form`; month buttons use `data-month-jump`; Destinations/Experiences/Saved use `data-nav-view`; AGNES uses existing planner hooks.

- [ ] **Step 2: Add mobile structural coverage**

Verify markup order matches the required mobile reading order and styling contracts collapse the layout without horizontal page overflow.

- [ ] **Step 3: Run the complete quality gate**

Run: `npm run check`
Expected: lint PASS, TypeScript build PASS, all Vitest tests PASS.

- [ ] **Step 4: Perform visual QA against the uploaded 1536×864 reference**

Compare rail width, intro baseline, hero/card proportions, gutters, radii, text hierarchy, image crops, rust accents, and bottom-row height. Correct only mismatches to the authoritative reference; do not introduce new design interpretation.

- [ ] **Step 5: Verify mobile manually at representative widths**

Check 390px and 430px widths: month strip scrolls, no page-level horizontal overflow, cards remain cinematic/full-width, controls are tappable, and AGNES does not cover key imagery.

- [ ] **Step 6: Commit final verification fixes**

Commit message: `test: verify editorial homepage interactions`
