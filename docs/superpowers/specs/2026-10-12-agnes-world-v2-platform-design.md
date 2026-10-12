# AGNES World V2 — Platform Design

Date: 2026-10-12
Branch: `feature/agnes-world-v2`
Status: Design approved in chat; written spec awaiting final review

## 1. Purpose

AGNES World V2 evolves the current dark-cinematic AGNES World experience from a curated travel showcase into a scalable travel discovery and planning platform.

The product must preserve the current brand philosophy:

> First make the traveler fall in love with the journey. Then reveal the practical path to take it.

V2 combines two equally important goals:

1. dramatically deeper worldwide travel content; and
2. real travel-commerce architecture that can support live search, availability, pricing and booking once verified provider integrations exist.

V2 must not become a generic OTA clone. Discovery remains editorial and cinematic; operational and commercial details appear progressively, after the journey has context and emotional appeal.

## 2. Product principles

### 2.1 Journey-first, not inventory-first

Users begin with how, when and why they want to travel. Inventory appears as a fulfillment layer, not as the visual identity of the product.

### 2.2 Multi-mode by default

AGNES treats four primary travel modes as first-class:

- Air
- Sea / Cruises
- Rail
- Road / Caravan

Supporting experience types may include island hopping, expeditions, safaris, ski trips, northern lights, river journeys, scenic drives and fly-in itineraries.

### 2.3 Month-aware worldwide relevance

The experience is dynamically seasonal. Every month, AGNES should prioritize what is genuinely good now, what is coming next and what remains flexible year-round.

The default month is derived from the runtime date. A user-selected month overrides the current month.

### 2.4 Truthful commerce

AGNES must never imply verified live prices, inventory, bookings or confirmations unless a connected provider has supplied them.

Until provider integrations exist, commercial UI must use language such as:

- Indicative
- From
- Request availability
- Check live options
- Plan with AGNES

### 2.5 Dark cinematic visual system

The current dark premium design remains the foundation:

- deep navy / black surfaces
- cream / champagne / muted-gold accents
- editorial serif headlines
- restrained sans-serif controls
- image-led layouts
- minimal chrome
- progressive disclosure of dense operational information

No wholesale visual redesign is part of V2.

## 3. Success criteria

V2 is successful when a traveler can:

1. discover the world by month, mode, region, feeling and origin;
2. search a significantly larger global catalog without losing the editorial feel;
3. open a journey and understand why it is worth taking;
4. inspect a route, day plan and practical details only when needed;
5. refine the trip through AGNES using deterministic planning logic initially;
6. save and compare journeys locally;
7. reach a provider-backed live-search step when integrations are available;
8. use the experience comfortably on mobile and desktop;
9. share or restore a selected journey state through the URL;
10. trust that unsupported claims are not presented as fact.

## 4. Scope

## 4.1 In scope

### Discovery

- global search and discovery
- mode-specific discovery for Air / Sea / Rail / Road
- region and country browsing
- origin-aware discovery
- seasonality and monthly ranking
- experience and feeling filters
- interactive route/map discovery
- saved journeys and favorites
- compare shortlist

### Journey detail

- cinematic hero
- exactly three signature moments as the default editorial baseline
- route overview
- interactive map or route strip
- day-by-day / chapter-by-chapter itinerary
- operational detail layer
- stay / cabin / station / port / road-stop context
- inquiry / live-search transition

### Mode-specific flows

#### Cruises

- departure-port-first search
- month-aware cruise ranking
- destination, duration and cruise-style filters
- ports of call
- cabin-class placeholders until provider data is live
- live-provider adapters later

#### Rail

- origin station / route-first discovery
- scenic, sleeper, high-speed and luxury classifications
- station sequences
- duration and overnight indicators
- operator references where verified

#### Road

- road-trip origin and route structure
- drive-time and distance fields
- stop sequence
- pace / driving-intensity filters
- caravan/camper suitability flags where known

#### Air

- fly-in journey discovery
- origin airport context
- destination cluster
- trip length and seasonality
- flight-search handoff through provider adapters when available

### AGNES planner

- deterministic intent parsing initially
- structured planning constraints
- journey refinement
- saved planning state
- safe fallback when no deterministic rule matches

### Platform foundations

- normalized domain data
- provider adapter interfaces
- search index / derived indexes
- ranking engine
- local persistence
- query/hash routing suitable for GitHub Pages
- test coverage for truthfulness and ranking

## 4.2 Explicitly out of scope for the first V2 implementation

- real payment processing
- fake provider inventory
- autonomous ticket purchasing
- unsupported claims of AI-generated live planning
- account authentication unless separately approved
- server-only SPA routing that breaks GitHub Pages
- a complete airline/GDS replacement
- a full hotel marketplace

## 5. Information architecture

Primary navigation:

- Explore
- Destinations
- Travel By
- Experiences
- Cruises
- Saved
- About AGNES
- Plan with AGNES

Primary discovery entry points:

1. Right Now · [Month]
2. Travel By
3. Explore by Region
4. Explore by Feeling
5. Start from [Origin]
6. Search the world

## 6. Core domain model

The existing flat journey objects should evolve into a normalized but still static-friendly domain layer.

### 6.1 Destination

```js
{
  id,
  name,
  countryCode,
  countryName,
  region,
  subregion,
  coordinates,
  types: ['city', 'island', 'coast', 'mountain', 'nature', 'port', 'station'],
  tags: [],
  media: {},
  seasonality: {}
}
```

### 6.2 Origin

```js
{
  id,
  type: 'airport' | 'port' | 'station' | 'road-origin',
  code,
  name,
  city,
  countryCode,
  coordinates
}
```

### 6.3 Journey

```js
{
  id,
  slug,
  mode: 'air' | 'sea' | 'rail' | 'road',
  type,
  title,
  subtitle,
  region,
  countries: [],
  destinationIds: [],
  originIds: [],
  duration: {
    minDays,
    maxDays,
    label
  },
  feelings: [],
  styles: [],
  seasonality: {
    bestMonths: [],
    availableMonths: [],
    shoulderMonths: [],
    yearRound: false
  },
  editorialPriority,
  hero,
  signatureMoments: [],
  route,
  chapters: [],
  operationalDays: [],
  stays: [],
  pricing: {
    kind: 'editorial' | 'provider',
    currency,
    from,
    disclaimer
  },
  commerce: {
    providerRefs: [],
    liveSearchSupported: false
  },
  agnesRules: [],
  media: {}
}
```

### 6.4 Cruise extension

```js
{
  cruise: {
    departurePortId,
    arrivalPortId,
    portsOfCall: [],
    cruiseLineRef,
    shipRef,
    sailingDates: [],
    cabinClasses: [],
    cruiseStyle: [],
    nights
  }
}
```

### 6.5 Rail extension

```js
{
  rail: {
    originStationId,
    destinationStationId,
    stations: [],
    operators: [],
    serviceType: 'scenic' | 'sleeper' | 'high-speed' | 'luxury' | 'regional',
    overnight: false,
    reservationRequired: null
  }
}
```

### 6.6 Road extension

```js
{
  road: {
    originId,
    endId,
    stops: [],
    estimatedDistanceKm,
    estimatedDriveHours,
    roadStyle: [],
    camperSuitable: null
  }
}
```

### 6.7 Air extension

```js
{
  air: {
    originAirportIds: [],
    arrivalAirportIds: [],
    recommendedNights,
    flightSearchSupported: false
  }
}
```

## 7. Catalog architecture

The current catalog should no longer depend on one increasingly large source file.

Suggested structure:

```text
docs/travel/data/
  destinations/
    europe.js
    asia.js
    africa.js
    north-america.js
    south-america.js
    oceania.js
  journeys/
    greece.js
    europe.js
    asia.js
    africa.js
    north-america.js
    south-america.js
    oceania.js
  origins/
    airports.js
    ports.js
    stations.js
    road-origins.js
  providers/
    operators.js
  index.js
```

A build-free aggregation module should export normalized collections for the browser.

The first V2 content milestone should move from the current 90+ journeys toward a much broader curated set without pretending to be exhaustive worldwide coverage. The architecture must support continued expansion without changing renderers.

## 8. Search and filtering

Search must be faceted and mode-aware.

### 8.1 Global search input

Searchable fields include:

- journey title
- destination
- country
- region
- origin
- port
- airport
- station
- feeling
- style
- mode

### 8.2 Shared filters

- Month
- Region
- Country
- Duration
- Travel mode
- Feeling / style
- Origin

### 8.3 Mode-specific filters

#### Cruise

- departure port
- destination region
- nights
- cruise style
- line / ship if provider data exists

#### Rail

- origin station
- destination region
- sleeper/scenic/high-speed/luxury
- duration

#### Road

- origin
- distance
- driving intensity
- camper suitability
- coastal / mountain / island / scenic

#### Air

- origin airport
- destination region
- trip length
- season

### 8.4 Search implementation

For the static V2 release, use a derived in-browser index rather than introducing a backend prematurely.

A normalized `search-index.js` should be derived from the catalog and expose pure functions such as:

```js
searchJourneys(journeys, query, filters)
rankSearchResults(results, context)
```

These functions must be deterministic and testable.

## 9. Ranking and seasonality

Ranking factors:

1. exact explicit user constraints
2. selected month / current month
3. availability month fit
4. best-month fit
5. origin relevance
6. mode match
7. duration fit
8. feeling/style fit
9. editorial priority

For cruises, departure-port relevance receives additional weight.

For rail, origin-station relevance receives additional weight.

For road, route-origin proximity may be used only when the user has explicitly supplied or selected a location/origin.

Do not infer precise location silently.

Seasonal buckets remain:

- In Season Now
- Coming Next
- Year-Round / Flexible
- Special Event / Last Chance when supported by explicit data

## 10. Interactive map and route discovery

V2 should introduce a reusable map/route presentation layer.

The implementation must degrade gracefully if no map provider is connected.

Baseline static-friendly behavior:

- destination dots / route line using SVG or lightweight DOM geometry
- clickable stops
- highlighted current chapter
- route summary

Future provider-compatible behavior:

- map tile adapter
- route geometry adapter
- live road routing adapter

No third-party map dependency should be mandatory for the first V2 release.

## 11. Saved journeys and comparison

V2 introduces local saved state using browser storage.

Capabilities:

- save journey
- remove saved journey
- compare up to 3 journeys
- persist selected month/origin/preferences locally
- restore saved shortlist on reload

No account sync is required in this phase.

Suggested module:

```text
docs/travel/saved-journeys.js
```

Storage schema must be versioned.

## 12. AGNES planner V2

AGNES remains truthful and deterministic until a real model endpoint exists.

### 12.1 Structured planning state

```js
{
  selectedMonth,
  mode,
  origin,
  regions: [],
  durationDays,
  audience,
  pace,
  budgetBand,
  feelings: [],
  drivingTolerance,
  cruiseStyle,
  railStyle,
  savedJourneyIds: []
}
```

### 12.2 Deterministic intents

Examples:

- “7 days in October by sea”
- “less driving”
- “from Limassol”
- “mountains by train”
- “romantic and quiet”
- “show me something warmer next month”
- “compare these two”

### 12.3 Output behavior

AGNES returns:

- a state patch
- an explanation
- ranked matching journeys
- an optional next action

AGNES must not claim actions that were not performed.

## 13. Provider integration architecture

V2 should define provider boundaries even if no live provider is connected yet.

Suggested interface:

```js
class TravelProviderAdapter {
  searchFlights(input) {}
  searchCruises(input) {}
  searchRail(input) {}
  searchStays(input) {}
  searchActivities(input) {}
  getAvailability(input) {}
}
```

Each response must include provenance:

```js
{
  provider,
  fetchedAt,
  currency,
  results,
  live: true
}
```

Editorial catalog data must never be mislabeled as provider data.

Provider failures should fall back to editorial planning, not break discovery.

## 14. Commerce transition

Journey pages should have a progressive commercial layer:

1. Discover the journey
2. Understand the route
3. Personalize with AGNES
4. Check live options
5. Compare dates / cabins / fares / stays
6. Handoff to provider or booking flow

Until integrations exist, step 4 should use a safe inquiry state rather than fabricated availability.

## 15. URL and navigation state

GitHub Pages remains a deployment target, so routing must remain static-host-safe.

Example URLs:

```text
?view=explore&month=10
?view=mode&mode=rail&region=Europe
?view=cruises&from=limassol&month=10
?view=journey&id=switzerland-grand-rail
?view=search&q=northern+lights&month=2
```

State reconstruction must be deterministic.

Back/forward browser navigation must work without losing selected filters.

## 16. Rendering architecture

The V2 renderer should remain modular.

Suggested modules:

```text
docs/travel/
  app.js
  journey-state.js
  journey-region.js
  seasonality.js
  ranking.js
  search-index.js
  search-render.js
  map-render.js
  cinematic-render.js
  cruise-render.js
  rail-render.js
  road-render.js
  air-render.js
  saved-journeys.js
  compare-render.js
  agnes-journey.js
  provider-gateway.js
```

The top-level `app.js` should orchestrate state and view selection, not contain large rendering implementations.

## 17. Visual and interaction design

### 17.1 Homepage

Keep the cinematic opening with:

- “See the world differently.”
- Air / Sea / Rail / Road entrances
- Right Now · [Month]
- featured journeys
- explore by feeling
- explore by region
- understated AGNES prompt

Add a global search field without turning the hero into an OTA form.

### 17.2 Search results

Search results should be editorial rails and rich cards, not dense spreadsheet grids.

Filters may use a compact dark overlay/drawer on mobile and a restrained sidebar on desktop.

### 17.3 Detail pages

Maintain the sequence:

1. cinematic hero
2. three signature moments
3. route / map
4. chapter-by-chapter narrative
5. practical layer
6. AGNES refinement
7. live-options / inquiry transition

### 17.4 Mobile

- bottom-safe AGNES dock
- no horizontal layout traps
- full-width chapters
- filter drawer
- touch-sized controls
- scroll restoration
- reduced-motion support

## 18. Content strategy

V2 should expand content systematically by region and mode.

Minimum content quality requirements per journey:

- clear title and subtitle
- correct region and countries
- mode/type
- realistic duration
- seasonality metadata
- route/stops
- three signature moments
- at least one practical chapter
- pricing disclaimer
- source/provenance notes where externally sourced

Content breadth should never come at the cost of obvious invented specifics.

## 19. Truthfulness and data provenance

Every externally sourced operational fact should be traceable.

For generated/editorial imagery:

- store attribution/provenance metadata when required
- do not imply a generated image is a real current property/ship/train cabin

For commercial data:

- `live: true` only from a real provider response
- timestamps on live data
- clear currency
- no stale price presented as current

## 20. Performance

The catalog will grow significantly. V2 should therefore:

- split regional data modules
- avoid rendering all journeys at once
- lazy-load imagery
- use derived indexes
- paginate or progressively reveal long collections
- minimize DOM churn on filter updates

No framework migration is required unless implementation evidence proves the current vanilla ES-module architecture cannot meet the goals.

## 21. Accessibility

- semantic headings
- visible focus states
- keyboard navigation
- accessible dialogs/drawers
- alt text for meaningful images
- reduced motion
- sufficient text/image contrast
- no essential interaction dependent only on hover

## 22. Testing strategy

V2 requires automated coverage for:

### Data integrity

- unique IDs
- valid regions/modes
- valid month values
- referenced origins/destinations exist
- no broken journey references

### Search

- query matching
- filter combinations
- mode-specific filters
- empty states

### Ranking

- month priority
- origin priority
- departure-port weighting
- selected filter precedence

### State

- URL roundtrip
- browser back/forward reconstruction
- saved-state schema migration

### AGNES

- deterministic intent parsing
- bounded state patches
- no unsupported live/booking claims

### Rendering

- homepage
- search
- cruises
- rail
- road
- air
- saved
- compare
- journey detail
- mobile-safe class/structure regressions

### Commerce truthfulness

- editorial data never marked live
- provider data must include provider + timestamp
- booking wording gated on verified capabilities

## 23. Migration strategy

V2 should be delivered incrementally on `feature/agnes-world-v2` without destabilizing the current live site.

Recommended migration order:

1. normalized data foundations
2. search/ranking engine
3. state/routing expansion
4. mode-specific renderers
5. saved/compare
6. map/route layer
7. AGNES planner V2
8. provider gateway contracts
9. UI integration and polish
10. regression and deployment verification

The existing AGNES World experience must remain usable throughout development.

## 24. Non-goals and safeguards

V2 must not:

- replace the dark cinematic identity with a white marketplace UI
- imply live booking without live integrations
- infer precise location without user consent
- hardcode current dates or months
- make AGNES pretend to be a live generative assistant when no model endpoint exists
- require a server for basic discovery
- make cruises the only rich mode while Rail/Road/Air remain shallow

## 25. Definition of done

AGNES World V2 is ready for merge when:

- all planned V2 views exist and share the same visual system
- the normalized catalog powers global search and mode discovery
- seasonality is dynamic and tested
- cruises, rail, road and air each have meaningful mode-specific behavior
- saved journeys and comparison work locally
- AGNES planning works deterministically and truthfully
- provider contracts exist without fake live inventory
- URL state restores correctly
- mobile and desktop layouts pass regression checks
- lint, build, tests, E2E and formatting all pass
- GitHub Pages deployment remains successful

## 26. Architectural recommendation

Retain the existing static-first ES-module architecture for V2 and add clear domain boundaries around data, search, ranking, planning and providers.

This is preferred over a framework rewrite because the current site already deploys successfully to GitHub Pages, the new requirements can be modeled as pure browser modules, and a rewrite would add migration risk without solving a demonstrated bottleneck.

A backend or framework migration should only be introduced later for a concrete requirement such as authenticated accounts, secure provider credentials, server-side booking orchestration or persistent cross-device user data.
