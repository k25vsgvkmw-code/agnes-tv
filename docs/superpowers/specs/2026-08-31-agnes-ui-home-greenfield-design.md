# AGNES Greenfield UI / Home Design

Date: 2026-08-31
Status: Design specification for user review
Repository: `k25vsgvkmw-code/agnes-tv`
Branch: `feature/agnes-ui-greenfield`

## 1. Decision

AGNES UI is rebuilt as a greenfield presentation layer on top of the existing verified AGNES Core.

The first UI release contains exactly one active screen: **Home** at `/`.

The following are explicit non-goals for this release:

- no inheritance of AGNES 9.2 screens, navigation, layouts, or visual structure;
- no migration of legacy Android `MainActivity` UI;
- no Travel, Kids, Shop, Supermarket, TV, Health, Sports, Cooking, or other feature pages;
- no hidden legacy routes waiting behind navigation;
- no direct database access from UI code;
- no replacement or restructuring of the existing Core modules.

The pre-greenfield Android application remains historical reference only on `backup/pre-greenfield-2026-08-30`.

The uploaded `AGNES-Family-OS-10.5.0-STORES-DATA-LIVE` archive is not an implementation baseline. Selected datasets, configuration, copy, or assets may be evaluated later, individually, but its screens, route structure, and legacy layouts must not be imported into this UI by default.

## 2. Product Intent

Home is the operational surface of AGNES Family OS. It should answer, at a glance:

1. What matters right now?
2. What is happening with the family today?
3. What requires attention soon?
4. What can AGNES do for me immediately?

Home is not a portal filled with links to mini-apps. It is a context-aware composition of the most relevant household information and actions.

The initial Home must feel complete even though it is the only screen.

## 3. Repository Architecture

The existing Core remains authoritative for domain state, persistence, event processing, permissions, integrations, intelligence, notifications, and audit.

A new frontend package is added inside the same repository:

```text
agnes-tv/
  src/                      # existing AGNES Core
  tests/                    # existing Core tests
  ui/                       # new greenfield frontend
    src/
      app/
      home/
      components/
      data/
      design-system/
      platform/
      test/
    public/
    package.json
    vite.config.ts
```

The UI package must not import private Core implementation modules through relative filesystem paths. Communication occurs only through versioned HTTP contracts.

### Technology

The frontend uses:

- React;
- TypeScript;
- Vite;
- Vitest and React Testing Library for unit/component tests;
- Playwright for route and end-to-end browser tests;
- browser APIs required for PWA installation.

The UI is responsive rather than split into separate desktop, mobile, or TV codebases.

## 4. Routing Contract

Release 1 supports one route:

- `/` → Home

Any unknown application route must resolve safely to Home rather than exposing a partially implemented page.

There must be no active routes for legacy or future verticals, including names or aliases for:

- Travel
- Kids / KidsWorld
- Shop
- Supermarket
- TV
- Sports
- Health
- Cooking
- 9.2

Future feature pages are added only after a separate design decision for that feature. At that point they must be greenfield screens using the current Core contracts, not resurrected legacy pages.

## 5. Home Information Architecture

### 5.1 Global top bar

The top bar presents compact system context:

- AGNES identity;
- local date and time;
- weather summary when available;
- system/data freshness indicator;
- direct voice/action affordance when supported.

The top bar must remain visually lightweight and must not become a traditional site navigation bar in Release 1.

### 5.2 Primary AGNES Hero

The main left-side hero is the emotional and operational anchor of Home.

It contains:

- AGNES visual/persona area;
- seasonal visual treatment;
- the highest-priority current message or situation;
- one clear primary action when appropriate;
- concise supporting context.

The hero must adapt to current context rather than act as a static marketing banner.

### 5.3 Family Status & Updates

A dedicated family panel presents household members and relevant live status.

The component must distinguish verified/current information from stale or unavailable information. Presence/status must never be fabricated from missing data.

### 5.4 Happens Now

A high-priority `HAPPENING NOW` / `ΣΥΜΒΑΙΝΕΙ ΤΩΡΑ` surface appears only when the Core reports a time-critical active situation.

This surface receives visual priority above routine information. Acknowledgement/action controls are included only for actions already exposed by verified Core contracts; Release 1 must not invent client-only state changes.

### 5.5 Today Timeline

The Home timeline presents the useful operational schedule for the current day.

It should optimize for scanning rather than render a full calendar application. Items may include:

- household calendar events;
- school/work/activity blocks;
- departures or deadlines;
- reminders or tasks surfaced by the Core.

### 5.6 Never-Miss / Opportunities

Important opportunities, deadlines, or reminders can appear as a Home section.

In Release 1 this is content inside Home, not a separate route.

### 5.7 Direct AGNES Action

Home provides a clear entry point for voice or typed interaction without requiring navigation to a chatbot page.

The interaction surface is progressively enhanced: typed interaction remains available when microphone or speech capabilities are unavailable.

## 6. Visual Direction

The greenfield UI must not copy the legacy dark IPTV visual language.

Primary characteristics:

- warm, premium Family OS rather than TV-app aesthetics;
- deep/slate purple as a structural color rather than pure black;
- earthy and sea-blue supporting tones;
- seasonal colors/background atmosphere;
- large, readable cards for wall/TV display;
- responsive density for desktop and mobile;
- clear hierarchy around the current situation;
- restrained animation that communicates state rather than decoration.

The visual system must be tokenized so later feature pages can use the same primitives without cloning Home CSS.

## 7. Home Snapshot API

The UI must not query PostgreSQL directly and must not depend on internal Core module structures.

The Core exposes a versioned read endpoint:

```http
GET /api/v1/home
```

The endpoint returns one read-optimized **Home Snapshot**. Exact field naming may evolve during implementation, but the contract must represent these conceptual groups:

```ts
type DataState = 'live' | 'stale' | 'unavailable';

type HomeSnapshot = {
  generatedAt: string;
  household: {
    id: string;
    timezone: string;
    locale: string;
  };
  currentSituation: {
    state: DataState;
    item: unknown | null;
  };
  familyStatus: {
    state: DataState;
    members: unknown[];
  };
  today: {
    state: DataState;
    items: unknown[];
  };
  opportunities: {
    state: DataState;
    items: unknown[];
  };
  environment: {
    state: DataState;
    weather: unknown | null;
  };
  system: {
    state: DataState;
    connectors: unknown[];
  };
};
```

The implementation plan must replace `unknown` with explicit DTOs derived from current Core contracts. The design intentionally does not invent domain fields that the Core does not yet guarantee.

### Snapshot principle

Home performs one primary snapshot fetch rather than coordinating provider-specific calls in the browser.

Aggregation belongs in the application/backend layer because it can:

- enforce permissions;
- normalize provider data;
- report freshness consistently;
- isolate provider outages;
- avoid leaking provider credentials or implementation details to the browser.

## 8. UI Data Adapter

The frontend contains a small data adapter between the HTTP API and presentational components.

Responsibilities:

- request `/api/v1/home`;
- validate/normalize the response;
- map API DTOs to UI view models;
- retain the last-known-good snapshot only in the approved private cache layer defined during implementation;
- expose loading, live, stale, and unavailable states;
- avoid provider-specific logic.

Presentation components consume view models, not raw provider payloads.

## 9. Failure and Freshness Model

Home is designed for partial degradation.

A failure in one source must not blank the whole screen.

Examples:

- weather unavailable → weather area shows unavailable/stale state; timeline remains usable;
- one connector degraded → connector-dependent sections degrade independently;
- opportunities unavailable → Home still displays current situation and today timeline;
- complete Home API failure → UI may show an approved last-known-good snapshot, clearly marked stale, plus a Core-unavailable status; if no approved cached snapshot exists, it shows an explicit unavailable state rather than demo data.

Rules:

1. Never label stale data as LIVE.
2. Never fabricate missing family status, events, opportunities, weather, or connector state.
3. Never replace unavailable real data with plausible demo content in production.
4. Error copy must be short and operational, not developer-oriented stack traces.
5. Retry behavior must be bounded and observable rather than an uncontrolled request loop.

## 10. Responsive Surfaces

The same Home feature set adapts to three primary presentation classes.

### Large display / TV

- high information visibility at distance;
- large type and focus targets;
- primary hero and Family Status are prioritized in the first viewport;
- keyboard/remote focus behavior is supported by shared component primitives.

### Desktop / monitor

- dashboard composition with hero and family panel side-by-side where space permits;
- timeline and Never-Miss content visible in the primary scroll flow.

### Mobile

- single-column hierarchy;
- `HAPPENING NOW` and primary AGNES message first;
- family/timeline sections stack cleanly;
- no desktop-only hover dependency.

Responsive behavior changes layout, not product semantics.

## 11. PWA Boundary

Release 1 includes the minimum installable PWA shell:

- web app manifest;
- installable application metadata/icons;
- safe static shell/asset caching required for installation and reload resilience.

Release 1 does **not** include offline mutation queues, advanced push workflows, background sync, or device-specific native integrations.

Caching of household snapshot data is separate from static PWA caching and must follow the privacy/freshness rules in Sections 8, 9, and 12.

## 12. Security and Privacy

The UI inherits authorization and household permissions from Core contracts rather than reimplementing policy in React.

Requirements:

- no provider secrets in frontend code or build-time public environment variables;
- no direct database credentials;
- no sensitive payloads written casually to browser logs;
- API errors must not expose internal stack traces;
- cached household data must be minimized and treated as private;
- future person-specific views must use Core permissions rather than UI-only hiding.

## 13. Testing Strategy

### 13.1 Core API contract tests

Tests verify that `/api/v1/home`:

- returns the versioned snapshot shape;
- composes available Core data correctly;
- represents unavailable dependencies explicitly;
- includes environment/weather freshness independently from other groups;
- does not require frontend knowledge of providers;
- preserves existing Core behavior.

### 13.2 UI component tests

Tests cover:

- Hero states;
- Family Status live/stale/unavailable rendering;
- Happens Now priority behavior;
- timeline rendering;
- Never-Miss rendering;
- weather/environment state;
- loading and degraded states.

### 13.3 Responsive tests

Representative viewport tests validate mobile, desktop, and large-display layouts.

Critical information must remain readable and reachable at each target size.

### 13.4 Route guard tests

Automated tests must confirm:

- `/` renders Home;
- unknown app routes recover to Home;
- no legacy route tree is registered;
- no Release 1 route exists for Travel, Kids, Shop, Supermarket, TV, Sports, Health, Cooking, or 9.2.

### 13.5 Legacy isolation tests

The new `ui` package must not import from the pre-greenfield Android code or copy its navigation architecture.

Repository checks should prevent accidental committed references to legacy UI source paths where practical.

### 13.6 End-to-end vertical slice

At least one E2E flow starts the Core and UI, loads a deterministic Home Snapshot, and verifies the user can see:

- current priority/situation;
- family status;
- a Today timeline item;
- weather/environment status;
- explicit health/freshness state.

## 14. CI / Merge Gate

The greenfield UI branch must not be merged unless all required checks pass.

The final CI composition must include:

- existing Core lint/build/tests;
- UI type checking;
- UI linting;
- UI unit/component tests;
- UI production build;
- Playwright route/E2E tests.

Adding UI must not weaken the existing Core CI guarantees.

## 15. Build Sequence

Implementation proceeds in vertical slices rather than building the complete visual shell first.

Required order:

1. create `ui` package and minimal Home route;
2. create Home Snapshot DTO/endpoint with deterministic test data from Core/application contracts;
3. create UI data adapter;
4. implement foundational design tokens and responsive shell;
5. implement top bar and primary Hero;
6. implement Family Status;
7. implement Happens Now;
8. implement Today timeline;
9. implement Never-Miss/opportunities;
10. implement environment/weather state;
11. add degraded/stale states and approved last-known-good handling;
12. add responsive/large-display behavior;
13. add minimum installable PWA shell;
14. add CI and E2E route/legacy guards;
15. polish seasonal visuals and interaction motion only after functional tests are green.

## 16. Acceptance Criteria

The design is successfully implemented when all of the following are true:

- the existing AGNES Core remains intact and its tests still pass;
- a new isolated React/TypeScript UI package exists in the repository;
- `/` is the only active product screen;
- Home visibly provides current priority, family status, Today timeline, weather/environment state, and system/freshness context;
- unavailable sources degrade independently and honestly;
- Home consumes a versioned Core read contract rather than provider payloads or database access;
- desktop, large-display/TV, and mobile layouts are usable;
- the minimum PWA shell is installable;
- legacy AGNES 9.2 and pre-greenfield screens/navigation are not dependencies of the new UI;
- the 10.5.0 archive has not been imported wholesale as a UI baseline;
- CI verifies both Core and UI before merge.

## 17. Explicit Future Rule

Every future AGNES feature page is a separate greenfield design/implementation decision.

A future page may reuse:

- Core contracts;
- design-system primitives;
- shared UI infrastructure;
- intentionally reviewed data/assets.

It may not automatically reuse:

- AGNES 9.2 layouts;
- legacy screen implementations;
- legacy navigation;
- a page merely because it exists in an older archive or backup branch.

This rule prevents the greenfield Home from gradually turning back into the old multi-page system through incremental legacy imports.
