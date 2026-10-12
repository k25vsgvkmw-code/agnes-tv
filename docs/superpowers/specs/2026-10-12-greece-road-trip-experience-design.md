# Greece Road Trip Experience — Zagorochoria Flagship Design

Date: 2026-10-12
Branch: `feature/greece-roadtrip-zagori-spec`
Product area: `docs/travel`

## 1. Purpose

Transform the existing AGNES Travel destination-detail experience from a utility/dashboard page into a cinematic, story-led road-trip experience. The first flagship implementation is a Greece road trip centered on Zagorochoria / Epirus, with the visual and interaction model intended to become the reusable standard for future road trips in Greece and Europe.

The product principle is:

> First make the traveler want to go. Then show them how to plan and book it.

The experience must therefore prioritize emotion, imagery, route narrative and signature moments before planning controls.

## 2. Scope

This first implementation adds one fully designed flagship road-trip detail experience to the existing static AGNES Travel site in `docs/travel`.

In scope:

- cinematic Zagorochoria hero;
- three signature moments immediately below the hero;
- trip-style selection presented as experience choices rather than admin controls;
- route overview with visual route map;
- complete day-by-day itinerary from departure through return;
- daily highlights, driving information and overnight stay cards;
- persistent AGNES conversation dock plus contextual AGNES suggestions;
- deterministic itinerary customization actions in the static site;
- clear final booking-summary section and call to action;
- responsive desktop and mobile behavior;
- reusable data and rendering structure for future road trips.

Out of scope for this implementation:

- payment processing;
- real booking transactions;
- live airfare, hotel inventory or rental-car inventory;
- real-time weather unless backed by an explicit API integration;
- a new frontend framework or SPA rewrite;
- authenticated user accounts;
- a production LLM/chat backend.

## 3. Existing System Constraints

The current Travel UI is a lightweight static site deployed from `docs/travel` through GitHub Pages. Navigation and destination-detail rendering currently live in `docs/travel/app.js`, with visual styling in `docs/travel/styles.css`.

The existing AGNES backend does not expose a production travel-assistant endpoint. The current Fastify server only registers health routes and uses `UnavailableModelGateway`, so the first road-trip release must not pretend that a remote AI conversation is live.

Therefore:

- the road-trip experience remains deployable as static GitHub Pages;
- AGNES interactions in this release are deterministic and trip-aware;
- the UI label is `AGNES` by default;
- `AGNES Live` may only be shown later when a real assistant endpoint is configured and reachable.

## 4. Experience Architecture

The road-trip detail page is a distinct cinematic mode inside the existing Travel UI. Utility/search views may retain the current Travel design language; entering the flagship road trip switches to an immersive design system.

Page order is fixed:

1. Hero
2. Signature Moments
3. Trip Style
4. Route Overview
5. Day-by-Day Itinerary
6. Stay / Experience details embedded in each day
7. AGNES interaction and personalization throughout
8. Booking Summary

Planning controls must not precede the emotional content.

## 5. Hero Design

Working content:

- Eyebrow: `ΕΛΛΑΔΑ · ΗΠΕΙΡΟΣ`
- Title: `ΖΑΓΟΡΟΧΩΡΙΑ · ΦΘΙΝΟΠΩΡΟ`
- Story line: `Πέτρινα χωριά. Δρόμοι στο βουνό. Ομίχλη πάνω από το φαράγγι.`

Hero facts are presented as compact overlays:

- best period;
- seasonal temperature range;
- recommended number of nights;
- suggested self-drive format;
- departure origin / flight access;
- indicative starting price.

Primary CTA:

`ΖΗΣΕ ΑΥΤΟ ΤΟ ROAD TRIP →`

Hero content is editorial and inspirational. Any indicative price or seasonal fact must be visibly framed as indicative/static unless connected to a verified live source.

## 6. Signature Moments

Immediately below the hero, render exactly three large visual moments:

1. `ΤΙ ΘΑ ΔΕΙΣ` — Vikos Gorge
2. `ΠΟΥ ΘΑ ΟΔΗΓΗΣΕΙΣ` — Zagori to Metsovo mountain route
3. `Η ΣΤΙΓΜΗ ΠΟΥ ΑΞΙΖΕΙ` — Meteora in morning mist / golden light

Each card contains:

- large destination-specific image;
- small uppercase editorial label;
- one emotional headline;
- at most one short supporting sentence.

No buttons, forms or dense metadata appear in this section.

## 7. Trip Style

Trip-style choices appear as lifestyle cards rather than technical filters.

Initial variants:

- `Classic Drive` — balanced comfort and flexibility;
- `SUV Adventure` — mountain-road emphasis;
- `Boutique Stays` — stronger accommodation curation;
- `Nature Escape` — slower route and outdoor emphasis.

Selecting a style updates `tripState.style` and may alter copy, highlighted stops and recommended stays. The first version does not need to recalculate pricing from an external source.

## 8. Route Overview

The route overview visually connects the trip chapters. Initial route:

`Arrival gateway → Ioannina → Zagorochoria → Metsovo → Meteora → Return gateway`

The map is an editorial route visualization rather than turn-by-turn navigation. It shows:

- named major stops;
- route line;
- selected highlight thumbnails;
- approximate total distance;
- trip duration;
- number of major regions / experiences;
- optional elevation cue.

A future real-map integration may replace the visual implementation without changing the trip-data contract.

## 9. Day-by-Day Itinerary

The itinerary covers the entire journey, including departure and return. It is not limited to destination days.

Each itinerary chapter contains:

- day identifier;
- editorial title;
- major destination image;
- short narrative description;
- ordered timeline;
- approximate driving distance and duration where applicable;
- signature moment;
- overnight stay card;
- contextual AGNES suggestion.

Baseline chapters:

- Departure / arrival
- Day 1 — Ioannina and first Epirus evening
- Day 2 — Zagorochoria / Vikos
- Day 3 — Zagori to Metsovo
- Day 4 — Metsovo to Meteora
- Day 5 — Meteora / flexible scenic day
- Return

The exact number of nights may be customized by AGNES actions, but the baseline dataset must remain internally consistent.

## 10. Trip State

Introduce one explicit client-side `tripState` object so visual controls and AGNES actions modify the same source of truth.

Conceptual shape:

```js
tripState = {
  tripId: 'zagori-autumn',
  style: 'classic',
  duration: 5,
  audience: 'couple',
  drivingPace: 'balanced',
  stayTier: 'boutique',
  weatherMode: 'normal',
  selectedDay: 'departure',
  agnesHistory: []
}
```

Every interactive customization must update state first and then re-render the affected sections.

## 11. Data Model

Move flagship road-trip content out of the current monolithic `app.js` into a dedicated data module.

Recommended file:

`docs/travel/trip-data.js`

The road-trip object includes:

- identity and slug;
- hero content;
- facts;
- signature moments;
- style variants;
- route stops;
- itinerary days;
- stay details;
- indicative pricing;
- AGNES suggestion rules;
- image asset paths and image credits/source metadata.

This separates content from rendering and makes future road-trip additions data-driven.

## 12. Rendering Boundaries

The implementation should split rendering into focused functions rather than growing the existing `detail()` function.

Recommended units:

- `renderRoadTripDetail(trip)`
- `renderTripHero(trip)`
- `renderSignatureMoments(trip)`
- `renderTripStyles(trip, state)`
- `renderRouteOverview(trip, state)`
- `renderItinerary(trip, state)`
- `renderBookingSummary(trip, state)`
- `renderAgnesDock(trip, state)`

Interaction wiring should be separate from HTML construction where practical.

## 13. AGNES Interaction Model

AGNES is a trip-aware copilot embedded in the page, not a generic floating chatbot.

### 13.1 Surfaces

AGNES appears in three ways:

1. persistent bottom conversation dock;
2. contextual message cards inside itinerary chapters;
3. quick-action suggestion chips.

### 13.2 First-release capabilities

Supported deterministic actions include:

- `Κάν’ το 4ήμερο`
- `Θέλω λιγότερη οδήγηση`
- `Κάν’ το πιο romantic`
- `Θέλω καλύτερα ξενοδοχεία`
- `Προσαρμογή για παιδιά`
- `Τι αλλάζεις αν βρέχει;`

Free-text input is accepted. A small intent parser maps recognized Greek and English phrases to known trip actions. Unrecognized requests receive a transparent bounded response such as:

`Μπορώ τώρα να αλλάξω διάρκεια, ρυθμό οδήγησης, τύπο διαμονής και family/romantic προσαρμογή.`

The interface must not imply that arbitrary questions are being answered by a live model.

### 13.3 Assistant adapter boundary

AGNES logic must sit behind an adapter such as:

```js
handleAgnesMessage(message, trip, state) -> {
  reply,
  statePatch,
  focusTarget
}
```

This contract allows a future remote assistant endpoint to replace the deterministic handler without rewriting the UI.

### 13.4 Future live integration

When a real AGNES travel endpoint exists, the adapter may call it and apply returned structured actions. The expected remote response shape should remain constrained to trip-safe state patches rather than arbitrary DOM instructions.

Only then may the interface display `AGNES Live`.

## 14. Visual Design System

The trip-detail mode uses:

- large photography-led sections;
- warm cream / parchment content surfaces;
- near-black editorial text;
- restrained gold accent for CTAs and active states;
- serif display typography for destination storytelling;
- clean sans-serif for utility information;
- soft rounded cards;
- minimal borders;
- subtle shadows;
- generous vertical spacing.

The design must avoid the appearance of an admin dashboard.

### Responsive behavior

Desktop:

- full-width cinematic hero;
- three-column signature moments;
- horizontal trip-style cards;
- wide route visualization;
- itinerary image + timeline + stay detail composition.

Mobile:

- hero content remains image-first but readable;
- signature moments stack vertically;
- trip styles become horizontal snap cards;
- route becomes horizontally scrollable or simplified;
- itinerary uses one-column chapters;
- AGNES dock stays reachable without covering core CTA/content.

## 15. Photography and Assets

The experience must use destination-specific imagery, not generic mountain placeholders.

Assets should be stored locally under a road-trip-specific folder, for example:

`docs/travel/assets/zagori/`

Each image entry in the trip data should carry enough source/credit metadata to document provenance. The implementation must avoid unapproved hotlinking.

A graceful image fallback is required so the page remains readable if an asset fails.

## 16. Booking Summary

The final section appears only after the user has consumed the route and itinerary.

It summarizes:

- flights / arrival assumption;
- vehicle;
- stays;
- selected experiences;
- insurance placeholder where applicable;
- indicative total.

Primary CTA:

`ΚΛΕΙΣΕ ΤΟ ROAD TRIP`

In this release, the CTA must not pretend to execute payment. It may lead to a clear inquiry/next-step state until a booking backend exists.

## 17. Navigation and Backward Compatibility

Existing Travel views — home, destinations, map, prices, compare and ready trips — remain functional.

The road-trip page is introduced without deleting the existing destination dataset or ranking flow.

A dedicated entry point should be available from Ready Trips and/or a featured home card. Existing generic destination cards may continue to use the legacy destination detail until road-trip data exists for them.

## 18. Error Handling

Static data load failure:

- show a clear fallback message;
- preserve main navigation;
- never leave an empty page.

Missing image:

- show a branded fallback surface and keep text visible.

Unknown AGNES input:

- return supported capabilities rather than fabricated information.

Invalid state transition:

- ignore the invalid patch;
- preserve the last valid `tripState`;
- return a user-readable AGNES message.

Future live assistant failure:

- fall back to deterministic AGNES actions;
- remove/disable the `Live` indicator;
- do not lose itinerary state.

## 19. Testing Strategy

Add focused automated tests for data and interaction behavior rather than relying only on visual inspection.

Minimum tests:

1. Zagori trip data validates required sections and itinerary chapters.
2. Road-trip detail renderer produces hero, three signature moments, itinerary and AGNES dock.
3. Duration action updates `tripState` and visible itinerary.
4. Reduced-driving action changes the expected state/route presentation.
5. Romantic, family and stay-tier actions update the expected UI labels/content.
6. Unknown AGNES message produces a bounded capabilities reply without corrupting state.
7. Legacy destination views still render.

Manual verification:

- desktop width;
- tablet width;
- mobile width;
- keyboard focus for controls;
- readable contrast over photography;
- no horizontal overflow except intentional carousels/route scrollers.

## 20. Deployment

No new deployment system is required.

The existing `travel-pages.yml` workflow already deploys changes under `docs/travel/**` to GitHub Pages. Implementation changes will therefore be developed on the feature branch, verified, then merged to `main` for production deployment.

## 21. Success Criteria

The first release is successful when:

- opening the Zagorochoria road trip feels like a travel story rather than a dashboard;
- the first viewport communicates destination, season, emotional promise and essential facts;
- three signature moments appear before planning controls;
- the full trip is understandable from departure through return;
- AGNES can modify supported trip preferences from the page and visibly update the experience;
- unsupported AGNES requests are handled transparently;
- existing Travel navigation remains intact;
- the structure can support a second road trip primarily by adding data and assets rather than rewriting the page.

## 22. Implementation Direction

Recommended approach: evolve the existing static Travel UI incrementally rather than rewriting it in a framework.

Reasoning:

- preserves the existing GitHub Pages deployment;
- minimizes migration risk;
- validates the UX standard quickly;
- keeps the flagship road-trip work isolated;
- creates a clean data/render/assistant boundary that can later migrate to a larger frontend architecture if product needs justify it.
