# AGNES Travel Opportunity Engine V1 Design

Date: 2026-08-31
Status: Design specification for user review
Repository: `k25vsgvkmw-code/agnes-tv`
Branch: `feature/travel-opportunity-engine-v1`

## 1. Goal

Build AGNES Travel as an intelligent opportunity engine, not a search-first booking page.

When Travel opens, the user should immediately see the best travel opportunities across the current period, next 30 days, coming month, 3-day escapes, holidays, the current season, and the year. Recommendations must prefer the right destination at the right time rather than merely the cheapest fare.

The first interaction should answer:

- Where is unusually good to travel now?
- Which upcoming 3-day escapes are strong opportunities?
- What should we consider for the next month or holiday period?
- Which destinations are in their ideal travel season?
- Is there a better date for the same destination?
- Is there a better destination for the same dates?

Manual destination search remains available but is secondary to discovery.

## 2. Product Principles

1. **Opportunity-first, not search-first.** The opening screen is ranked recommendations, not an empty search form.
2. **Best value, not cheapest fare.** Price is one scoring input among seasonality, weather, travel time, directness, accommodation value, events, crowd level and trip duration.
3. **Season-aware.** A cheap fare in a poor travel period must not automatically rank highly.
4. **Fast comparison.** Alternative dates and alternative destinations must be visible in Quick View without leaving the current screen.
5. **Low-friction.** The user should be able to move from discovery to a viable trip in a few taps.
6. **Provider-neutral.** Domain logic never depends directly on a specific flight, hotel or affiliate provider.
7. **AGNES-native.** Travel uses household context and the common AGNES contracts rather than becoming a disconnected mini-app.

## 3. Opening Experience

The Travel home screen is composed in this priority order.

### 3.1 For You Now

Highest-ranked opportunities available in the near term.

Each card shows:

- destination and country;
- hero image;
- AGNES Travel Score out of 100;
- recommended dates;
- number of nights;
- indicative total price and per-person basis;
- direct / one-stop status;
- travel duration;
- expected temperature range;
- short season suitability label such as `Ideal season`, `Very good period`, or `Shoulder-season value`.

### 3.2 Smart 3-Day Escapes

Ranked short-break windows using patterns such as:

- Friday to Monday;
- Saturday to Tuesday;
- long weekends around public holidays;
- other three-night windows that minimize disruption and maximize value.

The engine must not assume a fixed weekend pattern when household availability information can provide a better window.

### 3.3 Next 30 Days

Strong opportunities over the coming 30 days, ranked by total opportunity score.

### 3.4 Next Month

A separate collection for the following calendar month so the user can plan slightly ahead without opening a date picker.

### 3.5 Holidays

Holiday collections include, when applicable:

- Christmas;
- Easter;
- public-holiday long weekends;
- school-break opportunities when household calendar information is available.

Holiday collections must include only destinations appropriate for that period.

### 3.6 Best This Season

Destinations whose seasonality profile is especially strong during the user's current or selected travel season.

### 3.7 Best This Year

A ranked radar of the best remaining travel opportunities in the year, including future ideal windows rather than only currently bookable bargains.

### 3.8 Any Dates

The user can express flexible intent such as:

`Find the best 3-4 nights in Rome in the next six months.`

or

`I do not care where or exactly when; find the strongest trip opportunities.`

## 4. Seasonal Presentation System

Travel must not use a fixed neon-purple page treatment.

The ambient visual theme is seasonal and derived from the user's local date in the household timezone. For the current household this is `Asia/Nicosia`.

Meteorological theme mapping:

- **Spring (Mar-May):** fresh greens, soft blossom accents, bright neutral surfaces.
- **Summer (Jun-Aug):** sea, sky, sun and warm sand tones.
- **Autumn (Sep-Nov):** amber, ochre, olive and warm earthy tones.
- **Winter (Dec-Feb):** cool blue, slate, soft white and restrained festive warmth where appropriate.

AGNES brand purple may remain as a controlled interaction/accent color, but must not dominate the page background or flatten all seasons into the same visual treatment.

Destination photography remains destination-authentic and is not recolored merely to match the global theme.

The theme changes automatically by local calendar date. No code path may hard-code one season as the permanent Travel appearance.

## 5. AGNES Travel Score

The canonical score is normalized to 0-100.

V1 weighted model:

- flight value: 22%
- accommodation value: 16%
- season suitability: 18%
- weather suitability: 12%
- directness / stop penalty: 10%
- total travel time: 8%
- trip-length fit: 6%
- event / experience relevance: 4%
- crowd pressure: 4%

The scoring service returns both the final score and a factor breakdown so the UI can explain why a recommendation is strong.

A recommendation with poor season suitability cannot receive a top-tier score solely because airfare is cheap.

Score bands:

- 94-100: exceptional opportunity;
- 90-93: excellent opportunity;
- 85-89: very good opportunity;
- 80-84: good opportunity;
- below 80: normally hidden from primary recommendation rows unless specifically requested.

The weights are configuration, not embedded inside provider adapters.

## 6. Season Suitability

Each destination has one or more travel suitability windows.

A suitability window contains:

- destination id;
- start month/day;
- end month/day;
- suitability score from 0-100;
- tags such as `city-break`, `beach`, `christmas-market`, `ski`, `spring`, `autumn`, `family`;
- reason summary;
- expected climate range when available.

Season suitability is independent of live price data.

This lets AGNES distinguish:

- cheap but poorly timed travel;
- shoulder-season value;
- peak experience but expensive travel;
- genuinely exceptional combinations of timing and price.

## 7. Quick View

Selecting any opportunity opens Quick View without leaving the Travel home context.

Quick View includes:

### 7.1 Same Destination, Other Dates

Preset comparisons:

- -7 days;
- -3 days;
- current choice;
- +3 days;
- +7 days.

It also supports:

- plus/minus custom days;
- Any Dates;
- Whole Month;
- Best 3 Nights;
- Best 4 Nights.

Each alternative row shows:

- dates;
- price;
- score;
- a best-choice marker when applicable.

### 7.2 Same Dates, Other Destinations

For the selected date window, Quick View also shows ranked destination alternatives with:

- destination;
- price;
- score;
- primary reason it may be better.

The engine may explicitly state that another destination is the stronger opportunity for the same dates.

Example behavior:

`Rome is a strong choice, but Budapest is a better overall opportunity for the same dates.`

## 8. Flexible-Date Query Model

The application contract supports exact and flexible intents.

Canonical date intent shapes:

- exact date range;
- plus/minus N days;
- calendar month;
- date horizon such as next 30/90/180 days;
- duration range such as 3-4 nights;
- holiday period;
- any dates within a horizon.

The domain must not encode UI-specific buttons. Buttons map into these canonical intents at the presentation boundary.

## 9. Destination Alternatives

Destination comparison operates on normalized opportunity candidates rather than provider results directly.

Alternative destinations should prefer comparable trip intent. For example, a three-night European city break should not be displaced by a seven-night long-haul beach holiday simply because its raw price score is strong.

Comparable-intent dimensions include:

- trip duration;
- broad travel style;
- total travel time;
- budget band;
- household/traveller fit;
- season suitability.

## 10. Architecture

Travel follows the AGNES modular core style and remains provider-independent.

Proposed module boundary:

`src/travel/`

Submodules:

- `domain/` — canonical travel entities and invariants;
- `scoring/` — deterministic Travel Score calculation and factor breakdown;
- `seasonality/` — ideal-window and suitability evaluation;
- `application/` — opportunity discovery, Quick View and flexible-date use cases;
- `ports/` — provider interfaces;
- `adapters/` — provider-specific implementations and test fixtures;
- `presentation/` — API/view-model contracts consumed by future AGNES clients.

No travel provider SDK or provider-specific response type may appear in domain or scoring code.

## 11. Canonical Domain Types

### Destination

Fields:

- id;
- city;
- country;
- country_code;
- airport_codes;
- timezone;
- tags;
- hero_image_reference optional.

### TravelWindow

Fields:

- starts_on;
- ends_on;
- nights;
- flexibility_days;
- source_intent.

### PriceQuote

Fields:

- currency;
- total_amount;
- per_person_amount;
- flight_amount optional;
- accommodation_amount optional;
- fetched_at;
- expires_at optional;
- provider_reference.

### JourneySummary

Fields:

- origin_airport;
- destination_airport;
- outbound_duration_minutes;
- inbound_duration_minutes;
- stops_outbound;
- stops_inbound;
- direct;

### WeatherSuitability

Fields:

- expected_low_c;
- expected_high_c;
- precipitation_risk optional;
- suitability_score;
- source_quality.

### OpportunityCandidate

Fields:

- id;
- destination;
- window;
- price_quote;
- journey;
- season_suitability;
- weather_suitability;
- experience_tags;
- crowd_score optional;
- score_breakdown;
- total_score.

## 12. Provider Ports

V1 defines explicit provider interfaces rather than binding the domain to one supplier.

Required ports:

- `FlightSearchPort`;
- `AccommodationSearchPort`;
- `WeatherInsightPort`;
- `DestinationKnowledgePort`;
- `HolidayCalendarPort`;
- `TravelImagePort` optional for presentation enrichment.

Adapters normalize external data into canonical Travel types before the opportunity engine sees it.

Initial automated tests use deterministic fixture adapters. A live provider adapter can then be added without changing scoring, seasonality or presentation contracts.

## 13. Opportunity Discovery Flow

1. Receive household/traveller context and date intent.
2. Generate candidate travel windows.
3. Generate candidate destinations suitable for the requested intent and season.
4. Fetch normalized flight and accommodation quotes through ports.
5. Enrich candidates with seasonality, weather and destination knowledge.
6. Reject candidates failing hard constraints.
7. Score remaining candidates deterministically.
8. Group into opening-screen collections.
9. Return ranked presentation DTOs.
10. On Quick View request, rerun comparison around the selected destination/window using the same scoring engine.

## 14. Hard Constraints and Graceful Degradation

V1 must support these constraints:

- origin defaults to Larnaca (`LCA`) when household travel settings do not override it;
- currency defaults to EUR;
- results include direct and one-stop journeys, but directness is scored positively;
- stale or missing provider data must be marked, not silently treated as current;
- unavailable accommodation pricing must reduce confidence rather than fabricate a total;
- unavailable weather insight must not produce invented temperature values;
- provider failure must degrade that factor or candidate cleanly rather than fail the entire Travel page.

## 15. Presentation Contract

The presentation layer receives fully prepared sections rather than raw provider data.

Travel Home response includes:

- local season theme;
- active traveller context;
- origin;
- `for_you_now`;
- `three_day_escapes`;
- `next_30_days`;
- `next_month`;
- `holidays` grouped by holiday;
- `best_this_season`;
- `best_this_year`;
- optional inspiration feature.

Each opportunity card includes only presentation-safe fields required by the UI.

Quick View response includes:

- selected opportunity;
- same-destination alternative dates;
- same-date alternative destinations;
- explanation text generated from deterministic score factors;
- available flexibility actions.

## 16. User Interface Direction

The eventual AGNES Travel screen follows the approved visual direction:

- large destination imagery;
- high information density without link-heavy clutter;
- visible score, price, dates, weather and journey quality on cards;
- Quick View on the same screen;
- seasonal ambient palette;
- minimal use of fixed brand purple outside controls and highlights;
- no classic blank booking-search homepage;
- responsive behavior suitable for desktop monitor panel and mobile cards.

The UI consumes application/presentation contracts and must not calculate canonical scores itself.

## 17. Testing Strategy

V1 requires deterministic tests for:

- scoring factor weights and normalization;
- poor-season cheap-fare penalty behavior;
- ideal-season positive ranking behavior;
- three-night window generation;
- holiday window generation;
- exact date intent;
- plus/minus flexible dates;
- Any Dates duration search;
- same-destination alternative-date ranking;
- same-date alternative-destination ranking;
- provider timeout / missing-data degradation;
- local seasonal theme mapping using `Asia/Nicosia` dates;
- stable ordering when scores tie;
- presentation DTOs containing no provider-specific types.

The implementation must pass the repository's standard `npm run check` verification.

## 18. V1 Scope Boundary

Included in V1 design:

- canonical Travel domain contracts;
- deterministic opportunity scoring;
- season suitability;
- candidate window generation;
- core home collections;
- Quick View comparison logic;
- flexible-date intent model;
- provider ports and fixture adapters;
- seasonal presentation contract;
- API/view-model contract suitable for the AGNES Travel page.

Not required for the first verified core slice:

- payment or booking execution;
- provider-specific checkout;
- scraping travel websites;
- loyalty-program optimization;
- final production visual shell before the shared AGNES presentation layer is ready;
- unsupported claims that fixture data is live pricing.

## 19. Success Criteria

The Travel V1 design is successful when a client can request the Travel home model and receive ranked, explainable opportunity collections that prioritize seasonally appropriate travel; open a selected opportunity and compare nearby dates; compare other destinations for the same dates; and render the page using a seasonal theme without embedding provider-specific logic in the client.

The system should feel as though AGNES has already searched and evaluated the travel market before the user opens the page.