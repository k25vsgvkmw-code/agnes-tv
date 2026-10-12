# AGNES World — Cinematic Travel Platform Redesign

**Date:** 2026-10-12  
**Status:** Design specification for review  
**Branch:** `feature/agnes-world-redesign`

## 1. Product intent

AGNES evolves from a Greece-first road-trip page into a global cinematic travel discovery system. The product should help a traveller decide **how they want to experience the world**, then lead them from inspiration to a practical journey plan without turning the interface into a generic booking engine.

The core promise is:

> **See the world differently. By air. By sea. By rail. By road.**

The experience remains story-first and image-led. Logistics, dates, routes, ship/train/vehicle details, and booking inquiry appear progressively after desire has been created.

## 2. Success criteria

The redesign succeeds when:

1. The first screen unmistakably feels global, premium, cinematic, and distinctly AGNES.
2. A user can enter through travel mode (`air`, `sea`, `rail`, `road`) or through seasonal/editorial collections.
3. The homepage automatically prioritises journeys relevant to the current month.
4. Cruises are discoverable by **departure port first**, with seasonality as a first-class ranking signal.
5. Journey details remain immersive and uncluttered; operational details are available on demand rather than dominating the page.
6. AGNES acts as a contextual co-pilot across discovery and journey detail without claiming a live AI/service connection that does not exist.
7. The architecture supports road trips, cruises, train journeys, island hopping, and flight-led itineraries with one reusable journey model.
8. The static GitHub Pages deployment remains intact and testable with the existing Node/Vitest toolchain.

## 3. Design direction

### 3.1 Visual system

The approved motif is retained consistently across the entire product:

- deep black / midnight navy foundation;
- warm cream and restrained gold accents;
- large editorial serif display type paired with a quiet sans-serif UI font;
- full-bleed cinematic photography;
- layered gradients rather than heavy card chrome;
- generous whitespace and large imagery;
- minimal borders, shadows, and glass effects;
- restrained motion and image transitions;
- no abrupt switch to a bright marketplace/OTA layout in operational screens.

The interface must never become a dense grid of unrelated white cards. Even search and booking-adjacent views must look like the same AGNES product.

### 3.2 Interaction principle

The experience follows:

**Inspire → orient → reveal detail → personalise → act.**

A journey detail therefore uses cinematic chapters first and operational planning second. Practical information is opened through a secondary layer/panel/section such as `View day plan`, `Route`, `Dates`, or `Cabins`, rather than being dumped into the hero.

## 4. Information architecture

### 4.1 Global navigation

Primary navigation:

- Explore
- Destinations
- Travel by
- Experiences
- Cruises
- About AGNES
- Plan with AGNES

`Travel by` exposes:

- By Air
- By Sea
- By Rail
- By Road

`Experiences` exposes editorial feelings/intent rather than transport:

- Romantic
- Wild
- Slow
- Family
- Luxury
- Hidden
- Seasonal

### 4.2 Homepage

The homepage is global, not Greece-only.

Hero copy:

- Eyebrow: `AGNES WORLD`
- Title: `See the world differently.`
- Supporting line: `By air. By sea. By rail. By road.`
- Primary CTA: `Tell AGNES how you want to travel`
- Secondary action: `Explore journeys`

Below the hero:

1. **Travel by mode** — four large cinematic entrances: Air, Sea, Rail, Road.
2. **Right Now · {Current Month}** — journeys ranked for the current month.
3. **Featured journeys** — cross-mode editorial picks.
4. **Explore by region** — Europe, Greece, Asia, Africa, Americas, Oceania.
5. **AGNES prompt band** — quick natural-language entry into discovery.

The page must feel like a curated magazine/streaming collection, not a destination database.

## 5. Monthly seasonality engine

Seasonality is a product rule across all journey types, not only cruises.

Each journey stores:

- `bestMonths`
- `shoulderMonths`
- optional `eventMonths`
- optional `avoidMonths`
- optional `yearRound`

A deterministic scoring helper derives one of:

- `in-season`
- `coming-next`
- `year-round`
- `off-season`

Homepage ordering favours `in-season`, then `coming-next`, then `year-round`. `off-season` journeys remain searchable but are not promoted as primary recommendations.

The current month is obtained from the browser date. Tests must inject a fixed month so ranking remains deterministic.

No live weather or availability claims are implied by seasonality labels.

## 6. Journey taxonomy

The shared journey model supports these initial types:

- `flight-escape`
- `rail-journey`
- `cruise`
- `island-hopping`
- `road-trip`
- `caravan-road-trip`
- `mountain-escape`
- `expedition`

Mode mapping:

- Air → flight-escape / multi-stop flight-led journey
- Sea → cruise / island-hopping / expedition
- Rail → rail-journey
- Road → road-trip / caravan-road-trip / mountain-escape

The UI says `Journey` generically unless a more specific term is useful.

## 7. Seed world collection

The first release should feel global without pretending to contain a complete commercial inventory.

Representative curated seed journeys:

### Road / Caravan
- Zagori · Metsovo · Meteora
- Peloponnese · Beyond the Map
- Dolomites Grand Drive
- Iceland Ring Road
- Scotland Highlands / NC500

### Rail
- Switzerland Grand Rail Journey
- Italy by Train
- Japan Rail Escape
- Vienna · Salzburg · Innsbruck

### Sea / Cruise / Island hopping
- Greek Islands from Limassol
- Greek Islands from Piraeus
- Adriatic & Croatia
- Amalfi & Capri by Sea
- Norwegian Fjords
- Nile Cruise
- Alaska Inside Passage
- Caribbean Escape

### Air-led
- Tokyo & Kyoto
- Cape Town & Winelands
- Patagonia
- Marrakech & Atlas
- Iceland Northern Lights

These are editorial seed experiences. Any unverified price, departure date, operator, vessel, flight, or availability must be explicitly labelled as indicative/demo content or omitted.

## 8. Cruises: departure-port-first design

Cruises are a dedicated experience family with a strong departure-first search model.

### 8.1 Cruise landing

The cruise landing preserves the dark cinematic visual system and contains:

- cinematic sea hero;
- `Departing from` selector as the first filter;
- `When` selector;
- `Destination` selector;
- `Cruise style` selector;
- popular departure ports strip;
- `Cruises Right Now · {Month}`;
- `Coming Next`;
- `Year-Round`;
- region collections.

### 8.2 Departure hubs

Seed hubs include:

- Limassol
- Piraeus
- Heraklion
- Civitavecchia / Rome
- Venice / Marghera
- Trieste
- Genoa
- Naples
- Bari
- Barcelona
- Palma
- Málaga
- Marseille
- Istanbul
- Kuşadası
- Southampton
- Miami
- Fort Lauderdale
- Port Canaveral
- New York
- Vancouver
- Seattle
- Dubai
- Abu Dhabi
- Doha
- Singapore
- Tokyo / Yokohama
- Hong Kong
- Sydney
- Brisbane
- Cape Town

These hubs are navigation/filter metadata, not a guarantee of live sailings.

### 8.3 Cruise detail

Cruise detail follows the same cinematic system as other journeys:

1. Hero / journey-at-a-glance
2. Signature moments
3. Route map / port sequence
4. Day chapters
5. Operational day plan
6. Ship overview
7. Dates / cabin classes if present in demo data
8. AGNES personalisation
9. Booking inquiry summary

The first release does **not** execute payments or claim confirmed availability. CTAs use language such as `Check options`, `Request availability`, or `Plan with AGNES` unless a real booking provider is connected later.

## 9. Journey detail system

All journey types use a reusable chapter model.

A detail page contains:

- full-bleed hero;
- duration / region / mode / season metadata;
- exactly three `Signature Moments` near the top;
- route overview;
- cinematic day/leg chapters;
- optional operational detail drawer/layer;
- stay/ship/train/vehicle detail where relevant;
- AGNES contextual intervention;
- final trip summary / inquiry CTA.

For itineraries, departure through return must be represented when applicable.

### 9.1 Operational layer

The user can reveal practical details without losing the narrative page:

- timings;
- transit/driving duration;
- port/station/parking notes;
- stay/cabin details;
- excursions;
- practical caveats;
- indicative costs.

This layer can be a full-screen modal/sheet on mobile and a side panel or inline expansion on desktop.

## 10. AGNES co-pilot

AGNES is hybrid:

- ambient suggestions embedded inside the journey;
- persistent bottom dock/prompt entry;
- quick actions relevant to the current context.

Examples:

- `Make it 4 days`
- `Less driving`
- `More romantic`
- `Better stays`
- `Family-friendly`
- `What if it rains?`
- `Show cruises from Limassol`
- `I want mountains by train`
- `I want sea and islands in October`

The current application has no live assistant backend. Therefore the production UI must **not** say `AGNES Live` or imply free-form real-time travel intelligence. The first release uses deterministic intent handling and transparent fallback language.

## 11. Data architecture

Create a generic `journeys-data.js` rather than expanding the existing road-trip-only schema.

Conceptual shape:

```js
{
  id,
  type,
  mode,
  title,
  subtitle,
  country,
  region,
  duration,
  hero,
  bestMonths,
  shoulderMonths,
  eventMonths,
  yearRound,
  departurePorts,
  signatureMoments,
  route,
  chapters,
  operationalDays,
  stays,
  transport,
  pricing,
  agnesRules,
  media
}
```

Cruise-specific fields are nested under `cruise`:

```js
cruise: {
  departurePort,
  returnPort,
  portsOfCall,
  ship,
  cabinClasses,
  sampleDepartures
}
```

The core renderer consumes generic fields and delegates type-specific operational panels to small specialised renderers.

## 12. Application architecture

Preserve the existing static GitHub Pages architecture under `docs/travel` and browser-native ES modules.

### 12.1 New focused modules

- `journeys-data.js` — global curated journey collection.
- `seasonality.js` — deterministic monthly scoring and labels.
- `journey-state.js` — selected journey, mode, month, filters, detail layer, AGNES history.
- `agnes-journey.js` — deterministic global AGNES intents.
- `cinematic-render.js` — global home/collections/journey renderers.
- `cruise-render.js` — cruise-specific discovery/detail fragments.
- `cinematic.css` — shared global dark cinematic design system.

### 12.2 Existing modules

The current Zagori implementation can remain as a compatibility source during migration, but the visible product should use the generic journey system. Road-trip-only naming should not leak into global navigation.

### 12.3 Routing

Because GitHub Pages serves a static site, navigation uses query/hash state rather than server-side routes.

Examples:

- `?view=explore`
- `?mode=sea`
- `?view=cruises&port=limassol`
- `?journey=greek-islands-limassol`

Direct refresh must reconstruct the same view from URL state.

## 13. Search and filtering

Discovery filters are contextual rather than universal.

Global:

- mode
- month
- region
- feeling / experience type

Cruises:

- departure port
- month
- destination region
- cruise style
- duration

Road:

- month
- region
- duration
- road/caravan preference

Rail:

- month
- region
- duration
- scenic / sleeper / city-to-city

Filters must never fabricate availability. They filter curated local data only.

## 14. Content and truthfulness rules

1. Do not present demo pricing as live pricing.
2. Do not show a `best price guarantee` unless a real commercial source supports it.
3. Do not show `24/7 support`, `free cancellation`, specific operator inventory, or confirmed dates unless backed by a real integration.
4. Editorial route and season recommendations may be shown if framed as curated guidance.
5. Generated/curated imagery may illustrate journeys, but should not imply a specific cabin, ship, hotel, or exact included product unless verified.
6. The first booking action is an inquiry/planning step, not payment.

## 15. Accessibility and responsive behaviour

- respect `prefers-reduced-motion`;
- keyboard-accessible navigation, filters, dialogs, and chapter controls;
- visible focus states;
- semantic buttons/links;
- sufficient text/image contrast;
- no horizontal page overflow;
- mobile safe-area support for the AGNES dock;
- operational overlays must have a clear close/back action and must not trap normal navigation;
- cinematic scroll effects must degrade to normal document flow when motion is reduced.

## 16. Error and fallback behaviour

- missing media → gradient/image fallback with content still readable;
- unknown journey ID → return to Explore with a clear message;
- unsupported AGNES input → show bounded supported-capabilities reply without mutating state;
- invalid URL/filter state → normalise to a valid default;
- empty collection → show a curated fallback collection rather than a blank page.

## 17. Testing strategy

Automated tests should cover:

- journey schema validity and unique IDs;
- seasonality ranking for all 12 months using injected dates;
- cruise departure-port filtering;
- `Right Now` / `Coming Next` classification;
- URL state parsing/serialization;
- generic journey rendering contracts;
- cruise detail rendering contracts;
- deterministic AGNES global intents and fallback;
- image fallback markup;
- regression of legacy ranking utilities where retained.

Manual verification should cover desktop, tablet, and narrow mobile layouts plus reduced-motion mode.

## 18. First implementation boundary

The first production-ready redesign delivers the complete **front-end AGNES World experience** with representative world journeys and a coherent cruise subsystem. It does not attempt to build a global real-time inventory, payment processor, live fares, live cruise availability, or a real assistant backend.

The architecture must make those integrations possible later without redesigning the UI again.

## 19. Final product rule

Every screen should answer at least one of these questions clearly:

- **What is worth experiencing now?**
- **How do I want to travel?**
- **What will this journey feel like?**
- **What does the practical plan look like?**
- **How can AGNES adapt it for me?**

If a screen only looks like a generic OTA search result or dashboard, it is outside the approved AGNES direction.
