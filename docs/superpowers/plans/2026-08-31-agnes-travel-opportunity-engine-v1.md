# AGNES Travel Opportunity Engine V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, provider-neutral Travel Opportunity Engine that ranks seasonally appropriate trips, supports flexible dates and Quick View comparisons, and returns presentation-ready seasonal collections for AGNES clients.

**Architecture:** Add a focused `src/travel/` subsystem with canonical domain types, deterministic seasonality/scoring services, flexible-window generation, provider ports, fixture adapters, opportunity discovery, Quick View comparison, and presentation DTO mapping. Keep provider-specific types out of domain/scoring code and preserve the backend-first AGNES architecture.

**Tech Stack:** Node.js 24, TypeScript 6, Vitest 3, Zod 4, existing AGNES modular core patterns.

**Spec:** `docs/superpowers/specs/2026-08-31-agnes-travel-opportunity-engine-design.md`

## Global Constraints

- Origin defaults to `LCA` when household travel settings do not override it.
- Currency defaults to `EUR`.
- Travel Score is normalized to `0-100`.
- Travel Score weights: flight 22%, accommodation 16%, season 18%, weather 12%, directness 10%, travel time 8%, trip-length fit 6%, event relevance 4%, crowd pressure 4%.
- Scores below 80 are normally excluded from primary recommendation rows.
- Provider SDK/types must not enter domain, scoring, seasonality, or presentation contracts.
- Missing price/weather data must reduce confidence or omit fields; never fabricate values.
- Seasonal theme uses household-local date in `Asia/Nicosia` unless another household timezone is supplied.
- Theme mapping: spring Mar-May; summer Jun-Aug; autumn Sep-Nov; winter Dec-Feb.
- Repository verification command: `npm run check`.

---

### Task 1: Canonical travel domain and provider ports

**Files:**
- Create: `src/travel/domain/travel-types.ts`
- Create: `src/travel/domain/date-intent.ts`
- Create: `src/travel/ports/travel-ports.ts`
- Test: `tests/travel/travel-domain.test.ts`

**Interfaces:**
- Produces: `Destination`, `TravelWindow`, `PriceQuote`, `JourneySummary`, `WeatherSuitability`, `SeasonSuitability`, `OpportunityCandidate`, `TravelDateIntent`, `TravelSearchContext`.
- Produces ports: `FlightSearchPort`, `AccommodationSearchPort`, `WeatherInsightPort`, `DestinationKnowledgePort`, `HolidayCalendarPort`.

- [ ] **Step 1: Write failing domain contract tests**

```ts
import { describe, expect, it } from 'vitest';
import { makeTravelWindow } from '../../src/travel/domain/travel-types.js';
import { parseTravelDateIntent } from '../../src/travel/domain/date-intent.js';

describe('travel domain', () => {
  it('derives nights from calendar dates without timezone drift', () => {
    expect(makeTravelWindow('2026-10-24', '2026-10-27', 'exact')).toMatchObject({ nights: 3 });
  });

  it('accepts any-dates intent with a bounded horizon and night range', () => {
    expect(parseTravelDateIntent({ kind: 'any-dates', horizonDays: 180, minNights: 3, maxNights: 4 })).toEqual({
      kind: 'any-dates', horizonDays: 180, minNights: 3, maxNights: 4,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run tests/travel/travel-domain.test.ts`
Expected: FAIL because `src/travel/domain/*` does not exist.

- [ ] **Step 3: Implement canonical types and validation**

`travel-types.ts` must export immutable interfaces for all spec types plus:

```ts
export type IsoDate = `${number}-${number}-${number}`;
export type TravelSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonLabel = 'ideal-season' | 'very-good-period' | 'shoulder-season-value' | 'poor-period';

export function makeTravelWindow(startsOn: IsoDate, endsOn: IsoDate, sourceIntent: string, flexibilityDays = 0): TravelWindow;
```

`date-intent.ts` must define the exact union:

```ts
export type TravelDateIntent =
  | { kind: 'exact'; startsOn: IsoDate; endsOn: IsoDate }
  | { kind: 'plus-minus'; startsOn: IsoDate; endsOn: IsoDate; flexibilityDays: number }
  | { kind: 'month'; year: number; month: number; minNights: number; maxNights: number }
  | { kind: 'horizon'; horizonDays: 30 | 90 | 180; minNights: number; maxNights: number }
  | { kind: 'holiday'; holidayId: string; minNights: number; maxNights: number }
  | { kind: 'any-dates'; horizonDays: number; minNights: number; maxNights: number };
```

Use Zod to reject invalid month numbers, negative flexibility, `minNights > maxNights`, and horizons outside 1-366 days.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/travel/travel-domain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/travel/domain src/travel/ports tests/travel/travel-domain.test.ts
git commit -m "feat(travel): add canonical domain and provider ports"
```

---

### Task 2: Seasonality and seasonal presentation theme

**Files:**
- Create: `src/travel/seasonality/seasonality.ts`
- Create: `src/travel/presentation/season-theme.ts`
- Test: `tests/travel/seasonality.test.ts`

**Interfaces:**
- Produces: `evaluateSeasonSuitability(destinationId, date, windows)`.
- Produces: `getTravelSeasonTheme(localDate, timezone)`.

- [ ] **Step 1: Write failing tests for ideal windows and theme mapping**

```ts
it('rates an in-window Rome autumn trip highly', () => {
  const result = evaluateSeasonSuitability('rome', '2026-10-24', [{ destinationId: 'rome', startMonth: 9, startDay: 1, endMonth: 11, endDay: 15, suitabilityScore: 96, tags: ['city-break','autumn'], reason: 'Comfortable city weather' }]);
  expect(result.score).toBe(96);
});

it('maps 31 August in Nicosia to summer and 1 September to autumn', () => {
  expect(getTravelSeasonTheme('2026-08-31', 'Asia/Nicosia').season).toBe('summer');
  expect(getTravelSeasonTheme('2026-09-01', 'Asia/Nicosia').season).toBe('autumn');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/travel/seasonality.test.ts`
Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement deterministic seasonality**

`evaluateSeasonSuitability` must support windows crossing year-end and return `{ score, label, reason, tags }`. Labels map as: `>=90 ideal-season`, `>=80 very-good-period`, `>=70 shoulder-season-value`, else `poor-period`.

`getTravelSeasonTheme` returns:

```ts
interface TravelSeasonTheme {
  readonly season: TravelSeason;
  readonly paletteToken: 'travel-spring' | 'travel-summer' | 'travel-autumn' | 'travel-winter';
  readonly brandAccent: 'agnes-purple';
}
```

Do not embed hex colors in backend code.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/travel/seasonality.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/travel/seasonality src/travel/presentation/season-theme.ts tests/travel/seasonality.test.ts
git commit -m "feat(travel): add season suitability and seasonal themes"
```

---

### Task 3: Deterministic AGNES Travel Score

**Files:**
- Create: `src/travel/scoring/travel-score.ts`
- Test: `tests/travel/travel-score.test.ts`

**Interfaces:**
- Produces: `scoreTravelOpportunity(input, weights?) -> { totalScore, breakdown, confidence }`.

- [ ] **Step 1: Write failing score tests**

```ts
it('prevents a poor-season cheap fare from becoming top-tier', () => {
  const result = scoreTravelOpportunity({ flightValue: 1, accommodationValue: .9, seasonSuitability: .25, weatherSuitability: .4, directness: 1, travelTimeFit: .9, tripLengthFit: 1, eventRelevance: .2, crowdScore: .8, dataConfidence: 1 });
  expect(result.totalScore).toBeLessThan(90);
});

it('rewards a balanced ideal-season direct trip', () => {
  const result = scoreTravelOpportunity({ flightValue: .85, accommodationValue: .8, seasonSuitability: .98, weatherSuitability: .9, directness: 1, travelTimeFit: .9, tripLengthFit: 1, eventRelevance: .7, crowdScore: .8, dataConfidence: 1 });
  expect(result.totalScore).toBeGreaterThanOrEqual(90);
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/travel/travel-score.test.ts`
Expected: FAIL because scorer is absent.

- [ ] **Step 3: Implement weights, clamping, breakdown, confidence**

Use exactly:

```ts
export const DEFAULT_TRAVEL_SCORE_WEIGHTS = {
  flightValue: 0.22,
  accommodationValue: 0.16,
  seasonSuitability: 0.18,
  weatherSuitability: 0.12,
  directness: 0.10,
  travelTimeFit: 0.08,
  tripLengthFit: 0.06,
  eventRelevance: 0.04,
  crowdScore: 0.04,
} as const;
```

Clamp factors to `0..1`, normalize total to `0..100`, and cap top-tier scores when `seasonSuitability < 0.5` so cheap poor-season trips cannot rank exceptional. `confidence` must reflect missing optional factors rather than inventing them.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/travel/travel-score.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/travel/scoring tests/travel/travel-score.test.ts
git commit -m "feat(travel): add deterministic opportunity scoring"
```

---

### Task 4: Flexible date and short-break window generation

**Files:**
- Create: `src/travel/application/generate-travel-windows.ts`
- Test: `tests/travel/travel-windows.test.ts`

**Interfaces:**
- Consumes: `TravelDateIntent`, holiday dates, optional household availability blocks.
- Produces: `generateTravelWindows(intent, context) -> TravelWindow[]`.

- [ ] **Step 1: Write failing tests**

Cover exact dates, `±3`, whole month, any-dates 3-4 nights, Friday-Monday, Saturday-Tuesday, and public-holiday extension.

```ts
it('generates Friday-Monday three-night escapes in the horizon', () => {
  const windows = generateTravelWindows({ kind: 'horizon', horizonDays: 30, minNights: 3, maxNights: 3 }, { today: '2026-09-01', holidays: [], availability: [] });
  expect(windows.some(w => w.nights === 3)).toBe(true);
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/travel/travel-windows.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement bounded deterministic generation**

Rules:
- exact returns one window;
- plus-minus generates unique shifted windows inside the flexibility bound;
- month and any-dates generate only durations inside `minNights..maxNights`;
- horizon generation prioritizes Fri-Mon and Sat-Tue patterns but may include better household-availability windows;
- holiday generation includes adjacent days only when within the allowed duration;
- maximum generated windows per intent: 120; stable sort by start date, then nights.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/travel/travel-windows.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/travel/application/generate-travel-windows.ts tests/travel/travel-windows.test.ts
git commit -m "feat(travel): generate flexible and three-day travel windows"
```

---

### Task 5: Fixture adapters and opportunity discovery service

**Files:**
- Create: `src/travel/adapters/fixture-travel-providers.ts`
- Create: `src/travel/application/discover-travel-opportunities.ts`
- Test: `tests/travel/discover-opportunities.test.ts`

**Interfaces:**
- Consumes all provider ports, seasonality service, scorer, and generated windows.
- Produces: `discoverTravelOpportunities(request, deps) -> OpportunityCandidate[]`.

- [ ] **Step 1: Write failing discovery tests**

Use deterministic fixtures for Rome, Budapest, Vienna, Milan and Barcelona. Assert:
- ideal-season balanced trip outranks a cheaper poor-season trip;
- provider timeout removes/degrades only affected data;
- missing accommodation does not fabricate a total;
- ties are stable by destination id and start date;
- results under 80 are excluded from primary mode.

- [ ] **Step 2: Verify failure**

Run: `npx vitest run tests/travel/discover-opportunities.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement fixture adapters**

Each adapter implements only its canonical port and returns provider-neutral records. Include an optional deterministic failure mode for timeout/missing-data tests.

- [ ] **Step 4: Implement discovery orchestration**

Pipeline:
1. generate windows;
2. list season-compatible destinations;
3. search flights/accommodation;
4. enrich weather/knowledge;
5. reject hard-constraint failures;
6. calculate score/confidence;
7. stable sort by score desc, confidence desc, total amount asc, destination id asc;
8. return candidates.

Do not call `ModelGateway`; explanations are deterministic at V1.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/travel/discover-opportunities.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/travel/adapters src/travel/application/discover-travel-opportunities.ts tests/travel/discover-opportunities.test.ts
git commit -m "feat(travel): discover ranked provider-neutral opportunities"
```

---

### Task 6: Quick View comparisons and Travel Home collections

**Files:**
- Create: `src/travel/application/get-travel-quick-view.ts`
- Create: `src/travel/application/get-travel-home.ts`
- Create: `src/travel/presentation/travel-dto.ts`
- Test: `tests/travel/travel-home-quick-view.test.ts`

**Interfaces:**
- Produces: `getTravelQuickView(selected, deps)`.
- Produces: `getTravelHome(request, deps)`.
- Produces presentation DTOs with no provider-specific fields.

- [ ] **Step 1: Write failing Quick View tests**

Assert same-destination rows include `-7`, `-3`, current, `+3`, `+7` where valid; Any Dates and Whole Month can be requested; alternative destinations preserve comparable intent; the engine can state that Budapest outranks Rome for the same dates.

- [ ] **Step 2: Write failing Home collection tests**

Assert response contains:

```ts
{
  theme,
  origin: 'LCA',
  currency: 'EUR',
  forYouNow,
  threeDayEscapes,
  next30Days,
  nextMonth,
  holidays,
  bestThisSeason,
  bestThisYear,
  inspiration,
}
```

and that cards expose only safe display fields: destination, country, image reference, score, dates, nights, price, directness, duration, temperature when known, season label, confidence.

- [ ] **Step 3: Verify failure**

Run: `npx vitest run tests/travel/travel-home-quick-view.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement Quick View**

Reuse the same discovery/scoring engine; never duplicate scoring rules. Alternative destination search must retain duration, budget band, broad travel style and travel-time comparability.

- [ ] **Step 5: Implement Travel Home grouping and DTO mapping**

Collections use deterministic filters over discovered opportunities. Generate deterministic explanations from the top score deltas, e.g. `Ideal season`, `Direct flight`, `Better overall value for these dates`.

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/travel/travel-home-quick-view.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/travel/application/get-travel-quick-view.ts src/travel/application/get-travel-home.ts src/travel/presentation/travel-dto.ts tests/travel/travel-home-quick-view.test.ts
git commit -m "feat(travel): add Quick View and Travel Home collections"
```

---

### Task 7: Composition root integration and full verification

**Files:**
- Modify: `src/app/*` composition files that register application services after inspection at implementation time.
- Create: `tests/travel/travel-v1.e2e.test.ts`
- Modify: `README.md` to reference the Travel design/plan after the slice is verified.

**Interfaces:**
- Consumes all Travel services.
- Produces one application-level entry point for Travel Home and Quick View using fixture adapters in tests.

- [ ] **Step 1: Inspect the existing composition root and write the failing end-to-end test first**

The E2E test must request Travel Home for `2026-09-01`, timezone `Asia/Nicosia`, origin `LCA`, two adults, then open Quick View for the top result. Assert autumn theme, non-empty ranked collections, score explanations, alternative dates and alternative destinations.

- [ ] **Step 2: Run E2E test and verify failure**

Run: `npx vitest run tests/travel/travel-v1.e2e.test.ts`
Expected: FAIL because Travel is not wired into the composition root.

- [ ] **Step 3: Wire Travel services into the existing application composition pattern**

Use existing dependency-injection/composition conventions; do not introduce a second application container. Keep live provider configuration absent from V1; fixture adapters are test-only.

- [ ] **Step 4: Run focused Travel suite**

Run: `npx vitest run tests/travel`
Expected: all Travel tests PASS.

- [ ] **Step 5: Run repository verification**

Run: `npm run check`
Expected: lint, TypeScript build and all Vitest tests PASS.

- [ ] **Step 6: Update README only after verification**

Add references to:
- `docs/superpowers/specs/2026-08-31-agnes-travel-opportunity-engine-design.md`
- `docs/superpowers/plans/2026-08-31-agnes-travel-opportunity-engine-v1.md`

State explicitly that V1 uses deterministic fixture providers and does not claim live prices.

- [ ] **Step 7: Final commit**

```bash
git add src/app tests/travel README.md
git commit -m "feat(travel): complete verified Travel Opportunity Engine V1"
```

---

## Verification Matrix

- Travel domain/date intent contracts: Task 1.
- Seasonal suitability and automatic seasonal palette token: Task 2.
- Exact weighted score and poor-season guardrail: Task 3.
- 3-day escapes, holidays, ±days, whole-month/any-dates windows: Task 4.
- Provider-neutral ranking and graceful degradation: Task 5.
- Same destination/other dates and same dates/other destinations Quick View: Task 6.
- For You Now, next 30 days, next month, holidays, season, year and inspiration presentation model: Task 6.
- Full application integration and `npm run check`: Task 7.

## Self-review

- No production live-pricing claim is introduced.
- Provider interfaces and canonical domain types are separated.
- Scoring names and weights are consistent across tasks.
- The UI does not calculate score or seasonality.
- Seasonal palette is represented by semantic tokens, not a permanent purple theme.
- Every spec-critical V1 behavior maps to a testable task.
