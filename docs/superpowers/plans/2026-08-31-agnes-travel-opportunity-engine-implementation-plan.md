# AGNES Travel Opportunity Engine V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, provider-neutral AGNES Travel Opportunity Engine that ranks seasonally appropriate trips, exposes flexible-date and same-date destination comparisons, and returns a seasonal Travel Home/Quick View API contract.

**Architecture:** Add a self-contained `src/travel` module following the existing modular-core style: framework-free domain/scoring/seasonality/application code, explicit provider ports, deterministic fixture adapters, and Fastify only at the transport boundary. V1 keeps travel data in memory/fixtures; it does not change the PostgreSQL schema. The existing AGNES composition root wires the Travel service without introducing a provider SDK dependency.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, Vitest 3, ESLint, Prettier. No new runtime dependency is required.

**Spec:** `docs/superpowers/specs/2026-08-31-agnes-travel-opportunity-engine-design.md`

## Global Constraints

- Travel is opportunity-first, not search-first.
- Origin defaults to `LCA`; currency defaults to `EUR`.
- Canonical score is 0–100 with weights: flight value 22%, accommodation value 16%, season suitability 18%, weather suitability 12%, directness 10%, travel time 8%, trip-length fit 6%, experience relevance 4%, crowd pressure 4%.
- A poor-season bargain must not become a top-tier recommendation solely because airfare is cheap.
- Primary rows normally hide scores below 80.
- Domain/scoring code must not import Fastify, PostgreSQL, provider SDKs, or AI SDKs.
- Missing provider/weather/accommodation data degrades confidence or the affected factor; it must never fabricate values.
- Seasonal presentation is derived from local date in `Asia/Nicosia`: Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
- Brand purple is an interaction accent, not a permanent page background.
- V1 uses deterministic fixture adapters and never presents fixture values as live market prices.
- TypeScript remains strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Every implementation task follows TDD: failing test, verify failure in CI/local runner when available, minimal implementation, verify pass, commit.

## File Structure

```text
src/travel/
  domain/
    types.ts                    # canonical destinations, windows, quotes, journeys and candidates
    date-intent.ts              # exact/flexible canonical date intent union
  seasonality/
    seasonality.ts              # suitability windows/evaluation
    seasonal-theme.ts           # local-date -> spring/summer/autumn/winter presentation theme
  scoring/
    travel-score.ts             # deterministic weighted 0-100 score + factor breakdown
  application/
    window-generator.ts         # exact, +/- days, month, horizon, 3-night and holiday windows
    opportunity-engine.ts       # candidate enrichment/scoring/ranking and home collections
    quick-view.ts               # same destination other dates + same dates other destinations
  ports/
    travel-ports.ts             # flight/accommodation/weather/knowledge/holiday provider contracts
  adapters/
    fixture-travel-data.ts      # deterministic destination/season/quote/journey fixtures
    fixture-travel-ports.ts     # fixture provider implementations
  presentation/
    travel-view-model.ts        # UI-safe Home/Quick View DTO construction
src/transport/
  travel-routes.ts              # GET /travel/home and GET /travel/quick-view
src/app/
  build-app.ts                  # compose fixture Travel V1 service
  server.ts                     # register Travel routes

tests/unit/
  travel-seasonality.test.ts
  travel-score.test.ts
  travel-window-generator.test.ts
  travel-quick-view.test.ts
  travel-routes.test.ts
  build-app.test.ts             # extend composition assertion

tests/integration/
  travel-opportunity-engine.test.ts
```

---

### Task 1: Canonical Travel Types and Date Intents

**Files:**
- Create: `src/travel/domain/types.ts`
- Create: `src/travel/domain/date-intent.ts`
- Test: `tests/unit/travel-window-generator.test.ts` (initial validation cases)

**Interfaces:**
- Produces `Destination`, `TravelWindow`, `PriceQuote`, `JourneySummary`, `WeatherSuitability`, `SeasonSuitability`, `ScoreBreakdown`, `OpportunityCandidate`, and `TravelDateIntent`.
- Dates inside domain objects use ISO calendar strings `YYYY-MM-DD`; timestamps such as quote fetch time use `Date`.

- [ ] **Step 1: Write failing validation/type-behavior tests**

Test exact and flexible date intent construction through exported helpers:

```ts
expect(exactDateIntent('2026-10-17', '2026-10-20')).toEqual({
  kind: 'exact',
  startsOn: '2026-10-17',
  endsOn: '2026-10-20',
});
expect(() => exactDateIntent('2026-10-20', '2026-10-17')).toThrow();
expect(durationHorizonIntent('2026-09-01', '2027-03-01', 3, 4).kind).toBe('duration_horizon');
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- tests/unit/travel-window-generator.test.ts`

Expected: FAIL because the Travel domain/date-intent modules do not exist.

- [ ] **Step 3: Implement canonical interfaces and validated helpers**

`TravelDateIntent` must be a discriminated union for:

```ts
'exact' | 'plus_minus' | 'calendar_month' | 'horizon' | 'duration_horizon' | 'holiday' | 'any_dates'
```

Helpers reject invalid ISO dates, inverted ranges, negative flexibility, and night ranges where minimum exceeds maximum.

- [ ] **Step 4: Verify pass and commit**

Run: `npm test -- tests/unit/travel-window-generator.test.ts`

Commit: `feat: add canonical travel domain contracts`

---

### Task 2: Seasonal Theme and Destination Suitability

**Files:**
- Create: `src/travel/seasonality/seasonal-theme.ts`
- Create: `src/travel/seasonality/seasonality.ts`
- Test: `tests/unit/travel-seasonality.test.ts`

**Interfaces:**
- `getSeasonalTheme(date: Date, timeZone?: string): SeasonalTheme`
- `evaluateSeasonSuitability(destinationId: string, startsOn: string, windows: readonly SuitabilityWindow[]): SeasonSuitability`

- [ ] **Step 1: Write failing tests**

Cover Nicosia dates around all four season boundaries and suitability windows that wrap year-end.

```ts
expect(getSeasonalTheme(new Date('2026-09-01T00:00:00Z'), 'Asia/Nicosia').season).toBe('autumn');
expect(getSeasonalTheme(new Date('2026-12-15T12:00:00Z'), 'Asia/Nicosia').season).toBe('winter');
```

Also prove that a December Christmas-market window scores Vienna strongly while an out-of-window beach-only period does not.

- [ ] **Step 2: Verify failure, implement, verify pass**

Implementation must use `Intl.DateTimeFormat` with the supplied timezone instead of assuming server UTC month.

Run: `npm test -- tests/unit/travel-seasonality.test.ts`

Commit: `feat: add travel seasonality and seasonal themes`

---

### Task 3: Deterministic AGNES Travel Score

**Files:**
- Create: `src/travel/scoring/travel-score.ts`
- Test: `tests/unit/travel-score.test.ts`

**Interfaces:**
- `scoreTravel(input: TravelScoreInput, weights?: TravelScoreWeights): TravelScoreResult`
- `TravelScoreResult = { total: number; breakdown: ScoreBreakdown; confidence: number }`

- [ ] **Step 1: Write failing score tests**

Tests must assert exact default weights sum to 1, clamping, deterministic rounding, missing-factor confidence reduction, and poor-season cap behavior.

Required behavior:

```ts
const cheapWrongSeason = scoreTravel({
  flightValue: 100,
  accommodationValue: 95,
  seasonSuitability: 25,
  weatherSuitability: 40,
  directness: 100,
  travelTime: 90,
  tripLengthFit: 90,
  experienceRelevance: 50,
  crowdPressure: 80,
});
expect(cheapWrongSeason.total).toBeLessThan(90);
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/travel-score.test.ts`

- [ ] **Step 3: Implement weighted score**

All supplied factors are normalized to 0–100. `crowdPressure` represents desirability (100 = low crowd pressure). Missing optional factors are excluded from the numerator and reduce confidence; they are not replaced with invented neutral scores. If `seasonSuitability < 45`, total is capped at 84; if `< 30`, capped at 79.

- [ ] **Step 4: Verify pass and commit**

Commit: `feat: add deterministic AGNES travel scoring`

---

### Task 4: Flexible Window Generation

**Files:**
- Create: `src/travel/application/window-generator.ts`
- Extend: `tests/unit/travel-window-generator.test.ts`

**Interfaces:**
- `generateTravelWindows(intent: TravelDateIntent, options?: WindowGeneratorOptions): readonly TravelWindow[]`
- `HolidayWindow` input remains provider-neutral and is supplied by the opportunity engine/holiday port.

- [ ] **Step 1: Add failing tests**

Cover exact range, +/-3 and +/-7 alternatives, whole month, next-30-day horizon, duration 3–4 nights, and smart three-night Friday–Monday/Saturday–Tuesday windows.

Date arithmetic must remain calendar-date based and timezone-independent.

- [ ] **Step 2: Verify failure, implement minimal generator, verify pass**

Bound generation to a maximum of 366 candidate starts and de-duplicate identical date ranges.

Run: `npm test -- tests/unit/travel-window-generator.test.ts`

Commit: `feat: generate flexible travel windows`

---

### Task 5: Provider Ports and Deterministic Fixture Adapters

**Files:**
- Create: `src/travel/ports/travel-ports.ts`
- Create: `src/travel/adapters/fixture-travel-data.ts`
- Create: `src/travel/adapters/fixture-travel-ports.ts`
- Test indirectly in: `tests/integration/travel-opportunity-engine.test.ts`

**Interfaces:**

```ts
interface FlightSearchPort {
  search(origin: string, destination: Destination, window: TravelWindow): Promise<JourneyQuote | null>;
}
interface AccommodationSearchPort {
  search(destination: Destination, window: TravelWindow, travellers: number): Promise<AccommodationQuote | null>;
}
interface WeatherInsightPort {
  getInsight(destination: Destination, window: TravelWindow): Promise<WeatherSuitability | null>;
}
interface DestinationKnowledgePort {
  listDestinations(): Promise<readonly Destination[]>;
  suitabilityWindows(destinationId: string): Promise<readonly SuitabilityWindow[]>;
}
interface HolidayCalendarPort {
  listHolidayWindows(from: string, to: string, locale: string): Promise<readonly HolidayWindow[]>;
}
```

- [ ] **Step 1: Write integration test expecting normalized fixture results**

Fixture data must include enough contrasting cases to prove ranking: Rome, Budapest, Vienna, Milan, Barcelona plus at least one poor-season bargain.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/integration/travel-opportunity-engine.test.ts`

- [ ] **Step 3: Implement ports and fixture adapters**

Adapters return canonical objects only. Fixture quote metadata includes `providerReference` prefixed with `fixture:` and `isLive: false` in adapter-level quote metadata so presentation can label data quality when needed.

- [ ] **Step 4: Commit**

Commit: `feat: add provider-neutral travel ports and fixtures`

---

### Task 6: Opportunity Engine and Home Collections

**Files:**
- Create: `src/travel/application/opportunity-engine.ts`
- Extend: `tests/integration/travel-opportunity-engine.test.ts`

**Interfaces:**
- `TravelOpportunityEngine.home(request: TravelHomeRequest): Promise<TravelHomeModel>`
- `TravelOpportunityEngine.discover(request: DiscoverTravelRequest): Promise<readonly OpportunityCandidate[]>`

- [ ] **Step 1: Write failing integration tests**

Assert:

- default origin is LCA and currency EUR;
- results rank by total score with destination id as deterministic tie-breaker;
- primary collections suppress scores below 80;
- September Nicosia returns autumn theme;
- `forYouNow`, `threeDayEscapes`, `next30Days`, `nextMonth`, `holidays`, `bestThisSeason`, and `bestThisYear` are present;
- a seasonally correct candidate outranks a cheaper badly timed candidate;
- missing weather/accommodation lowers confidence but does not crash the Home response.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/integration/travel-opportunity-engine.test.ts`

- [ ] **Step 3: Implement discovery pipeline**

Pipeline order: generate windows -> shortlist season-compatible destinations -> fetch normalized quotes/insights -> reject hard-invalid candidates -> score -> stable sort -> group into collections.

Provider calls must be isolated with per-factor `try/catch`; a provider failure returns missing factor data for that candidate rather than rejecting the entire page.

- [ ] **Step 4: Verify pass and commit**

Commit: `feat: build Travel Opportunity Engine home collections`

---

### Task 7: Quick View Comparisons

**Files:**
- Create: `src/travel/application/quick-view.ts`
- Test: `tests/unit/travel-quick-view.test.ts`

**Interfaces:**
- `buildQuickView(engine, request): Promise<QuickViewModel>`
- Request identifies selected destination/date window and traveller count.

- [ ] **Step 1: Write failing tests**

Assert same-destination date alternatives include `-7`, `-3`, current, `+3`, `+7`; Any Dates/Whole Month/Best 3 Nights/Best 4 Nights are represented as canonical actions; and same-date alternative destinations are ranked by the same Travel Score.

The selected row must remain present even if a nearby alternative is better.

- [ ] **Step 2: Verify failure, implement, verify pass**

Explanation text must be deterministic from score factors, e.g. `Budapest ranks higher for these dates because season suitability and total value are stronger.` No AI call is required.

Commit: `feat: add Travel Quick View comparisons`

---

### Task 8: Presentation DTOs, Fastify Routes, and Composition

**Files:**
- Create: `src/travel/presentation/travel-view-model.ts`
- Create: `src/transport/travel-routes.ts`
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Modify: `tests/unit/build-app.test.ts`
- Create: `tests/unit/travel-routes.test.ts`

**Interfaces:**
- `registerTravelRoutes(app, travelService): Promise<void>`
- `GET /travel/home?date=2026-09-01&travellers=2`
- `GET /travel/quick-view?destinationId=rome&startsOn=2026-10-17&endsOn=2026-10-20&travellers=2`

- [ ] **Step 1: Write failing route/composition tests**

Use Fastify `inject`. Assert 200 responses, seasonal theme, opportunity cards, Quick View alternatives, and `dataQuality: 'fixture'` so the API never implies live pricing.

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/travel-routes.test.ts tests/unit/build-app.test.ts`

- [ ] **Step 3: Implement DTO mapping/routes/composition**

`AgnesApp` exposes `travelOpportunityEngine`. `server.ts` registers Travel routes after health routes. The presentation DTO contains no adapter classes/provider response types.

- [ ] **Step 4: Verify pass and commit**

Commit: `feat: expose AGNES Travel opportunity API`

---

### Task 9: Full Verification and Documentation Alignment

**Files:**
- Modify: `README.md` (add Travel V1 reference/fixture-data status)
- No production schema changes.

- [ ] **Step 1: Run focused tests**

```bash
npm test -- tests/unit/travel-seasonality.test.ts
npm test -- tests/unit/travel-score.test.ts
npm test -- tests/unit/travel-window-generator.test.ts
npm test -- tests/unit/travel-quick-view.test.ts
npm test -- tests/unit/travel-routes.test.ts
npm test -- tests/integration/travel-opportunity-engine.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run repository quality gate**

```bash
npm run check
npm run format:check
```

Expected: lint, TypeScript build, all tests and formatting PASS.

- [ ] **Step 3: Verify core regression slice**

```bash
npm test -- tests/e2e/calendar-to-notification.test.ts
```

Expected: PASS.

- [ ] **Step 4: Open PR to `main` and use GitHub CI as authoritative verification**

The PR must state explicitly that V1 uses deterministic fixture travel data and no price shown by the test adapter is claimed to be live.

- [ ] **Step 5: Commit docs**

Commit: `docs: document Travel Opportunity Engine V1`

## Self-Review

- Spec coverage: scoring, seasonality, flexible dates, Quick View, alternatives, Home collections, provider ports, degradation, seasonal theme and presentation contracts are all mapped to tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step remains.
- Type consistency: `TravelDateIntent`, `OpportunityCandidate`, `TravelOpportunityEngine`, `TravelHomeModel` and `QuickViewModel` are introduced once and consumed consistently by later tasks.
- Scope: payment/booking execution, live-provider adapters, loyalty optimization and final visual client remain outside this verified backend slice as required by the approved spec.
