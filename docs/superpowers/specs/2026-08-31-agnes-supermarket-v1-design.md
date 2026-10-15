# AGNES Supermarket v1 Design

Date: 2026-08-31
Status: Design specification for user review
Repository: `k25vsgvkmw-code/agnes-tv`
Branch: `feature/supermarket-v1-design`

## 1. Product Goal

AGNES Supermarket is the household grocery-shopping subsystem inside the unified AGNES Personal & Family Operating System.

Its purpose is not to reproduce supermarket websites. AGNES must aggregate offers and prices, understand the household shopping list, compare realistic basket totals, surface the best opportunities first, and keep the shopping experience inside AGNES until the final retailer-controlled payment or confirmation step when no supported retailer checkout API exists.

The primary v1 experience is:

`Offers first -> Add to AGNES basket -> Compare -> Optimize -> Revalidate -> Retailer handoff/payment`

The user-approved checkout model is **Model A**: AGNES is the primary shopping experience. Provider handoff happens only at the final stage that AGNES cannot safely or officially execute itself.

## 2. Product Principles

1. **Offers first.** The first supermarket surface prioritizes current, materially useful deals before the ordinary catalogue.
2. **True savings, not headline discounts.** Ranking uses current price, reference price where trustworthy, unit price, basket impact, and delivery/collection cost where available.
3. **One AGNES basket.** The household works with a canonical AGNES basket even when items originate from different retailers.
4. **Retailer truth is authoritative.** Price, stock, delivery slots, payment, and order acceptance remain retailer-authoritative when owned by the retailer.
5. **Revalidate before handoff.** AGNES refreshes price and availability immediately before checkout handoff whenever the connector supports it.
6. **No unsupported purchasing automation.** AGNES does not impersonate the user, bypass retailer controls, automate payment through undocumented/private endpoints, or claim an order is confirmed unless a provider confirms it.
7. **Provider independence.** AlphaMega, Lidl, e-Kalathi, and future retailers are adapters behind AGNES contracts, not dependencies embedded in shopping domain logic.
8. **Seasonal visual system.** Supermarket presentation uses season-aware colors and imagery rather than a permanently purple theme. Seasonal styling is presentation metadata; it never changes shopping logic.

## 3. Scope

### 3.1 In scope for Supermarket v1

- AlphaMega catalogue and offers ingestion from supported official/public sources.
- Lidl Cyprus current offers ingestion from supported official/public sources.
- e-Kalathi price-comparison ingestion from supported official/public sources.
- canonical retailer/product/offer/price models.
- product matching across sources.
- offer freshness and provenance.
- household shopping list and AGNES basket.
- basket-price comparison by retailer.
- split-basket optimization with a configurable minimum saving threshold.
- unit-price normalization where source data permits it.
- price history generated from AGNES observations.
- checkout-session preparation.
- final retailer handoff when AGNES cannot execute the retailer-controlled checkout stage.
- explicit price/availability revalidation before handoff where supported.
- presentation contract for an Offers-first Supermarket home.
- seasonal theme metadata for the presentation layer.
- audit events for imports, basket decisions, and checkout handoff.

### 3.2 Not in scope for Supermarket v1

- storing supermarket payment-card credentials in AGNES.
- undocumented/private checkout API automation.
- claiming delivery-slot availability unless confirmed by a source that exposes it.
- automated order placement without explicit user confirmation.
- loyalty-card credential scraping.
- generalized Cyprus retailer coverage beyond the first AlphaMega/Lidl/e-Kalathi slice.
- a retailer-independent payment processor.
- full production UI before the required backend contracts are verified.

## 4. Architecture

AGNES Supermarket is a new modular subsystem aligned with the existing AGNES modular core and event-driven boundaries.

The subsystem is divided into five clear areas:

1. **Shopping domain** — canonical shopping entities and invariants.
2. **Shopping application services** — use cases such as refresh offers, build basket, compare basket, optimize basket, and prepare checkout.
3. **Shopping ports** — provider-independent contracts consumed by application services.
4. **Retail adapters** — AlphaMega, Lidl, and e-Kalathi implementations behind existing AGNES connector contracts.
5. **Persistence and events** — PostgreSQL repositories, observation history, domain events, and transactional outbox publication.

Provider-specific parsing, request construction, URLs, tokens, pagination, and schema mapping are isolated inside adapters. Shopping domain code must not import provider SDKs or provider-specific DTOs.

## 5. Domain Model

### 5.1 Retailer

Fields:

- `id`
- `slug`
- `displayName`
- `countryCode`
- `supportsCatalogue`
- `supportsOffers`
- `supportsBasketRevalidation`
- `supportsCheckoutHandoff`
- `supportsDirectCheckout`
- `status`

Initial canonical retailers:

- `alphamega-cy`
- `lidl-cy`
- `e-kalathi-cy` as a comparison source, not a checkout retailer

### 5.2 Product

Canonical household-shopping identity independent of a retailer listing.

Fields:

- `id`
- `canonicalName`
- `brand` optional
- `category`
- `subCategory` optional
- `gtin` optional
- `sizeValue` optional
- `sizeUnit` optional
- `imageUrl` optional
- `status`

### 5.3 RetailerListing

Represents one retailer/source listing mapped to a canonical Product.

Fields:

- `id`
- `productId`
- `retailerId`
- `externalId`
- `externalUrl` optional
- `sourceName`
- `title`
- `brand` optional
- `packageText` optional
- `imageUrl` optional
- `gtin` optional
- `availability`
- `lastObservedAt`

A uniqueness constraint prevents duplicate listings for the same `(retailerId, externalId)`.

### 5.4 PriceObservation

Immutable observed price data.

Fields:

- `id`
- `retailerListingId`
- `price`
- `currency`
- `referencePrice` optional
- `unitPrice` optional
- `unitBasis` optional
- `promotionId` optional
- `observedAt`
- `sourceUpdatedAt` optional
- `provenance`

Historical price charts are derived from observations rather than mutable price rows.

### 5.5 Offer

Fields:

- `id`
- `retailerListingId`
- `offerType`
- `headline`
- `currentPrice`
- `referencePrice` optional
- `discountPercent` optional
- `startsAt` optional
- `endsAt` optional
- `membershipRequired`
- `termsText` optional
- `observedAt`
- `status`

Offer status is computed from explicit validity dates where present plus freshness rules. A stale offer must never be presented as current without a stale warning.

### 5.6 ShoppingList

Fields:

- `id`
- `householdId`
- `name`
- `status`
- `createdByPersonId`
- `createdAt`
- `updatedAt`

### 5.7 ShoppingListItem

Fields:

- `id`
- `shoppingListId`
- `requestedText`
- `productId` optional
- `quantity`
- `preferredBrand` optional
- `substitutionPolicy`
- `status`

### 5.8 Basket

Fields:

- `id`
- `householdId`
- `status`
- `currency`
- `createdByPersonId`
- `createdAt`
- `updatedAt`

### 5.9 BasketItem

Fields:

- `id`
- `basketId`
- `productId`
- `preferredListingId` optional
- `quantity`
- `substitutionPolicy`
- `selectedRetailerId` optional

### 5.10 BasketQuote

A time-bound computed quote; it is not an order.

Fields:

- `id`
- `basketId`
- `strategy`
- `retailerSegments`
- `itemsSubtotal`
- `feesEstimate` optional
- `totalEstimate`
- `baselineTotal` optional
- `estimatedSaving` optional
- `quotedAt`
- `expiresAt`
- `freshness`

### 5.11 CheckoutSession

Fields:

- `id`
- `basketId`
- `basketQuoteId`
- `retailerId`
- `mode`
- `status`
- `handoffUrl` optional
- `providerReference` optional
- `validatedAt` optional
- `expiresAt` optional
- `createdByPersonId`
- `createdAt`

Checkout modes:

- `direct_provider_api`
- `prefilled_handoff`
- `retailer_handoff`

A v1 provider may support only `retailer_handoff` and still participate fully in AGNES comparison and basket optimization.

## 6. Product Matching

Cross-retailer comparison is valid only when AGNES has adequate product identity confidence.

Matching priority:

1. exact GTIN/barcode match;
2. exact trusted provider mapping;
3. normalized brand + product name + package size;
4. conservative fuzzy candidate requiring confidence above the configured threshold.

AGNES stores the match method and confidence. Low-confidence matches may be shown as alternatives but must not silently drive an "exact same product" savings claim.

Comparable alternatives are allowed as a separate optimization class when they have equivalent purpose and compatible quantity/unit. Alternative recommendations must be labeled as alternatives, not exact matches.

## 7. Source Strategy

### 7.1 AlphaMega

Primary role:

- richest initial catalogue source;
- product imagery and metadata;
- current prices and offers where officially/publicly exposed;
- retailer handoff or stronger checkout preparation only where an official supported mechanism exists.

### 7.2 Lidl Cyprus

Primary role:

- current and upcoming official offers;
- Lidl Plus/public offer metadata where available without user credential scraping;
- product imagery and validity periods from supported official/public sources.

Lidl is not assumed to expose a complete grocery e-commerce catalogue in v1.

### 7.3 e-Kalathi

Primary role:

- cross-retailer price-comparison observations;
- barcode/product identity evidence where available;
- validation signal for comparable products and prices.

AGNES treats e-Kalathi as an external authoritative comparison source for the fields it publishes, not as a checkout retailer.

### 7.4 Source compliance

Before enabling a production connector, the adapter implementation must record:

- source URL/base endpoint;
- acquisition method;
- authentication requirements if any;
- update frequency;
- rate limits where known;
- permitted usage constraints;
- provenance metadata stored with observations.

If an official/public source disallows automated retrieval or becomes technically unstable, the connector must degrade cleanly rather than bypass controls.

## 8. Connector Contracts

Retail adapters implement the existing AGNES `Connector<TRecord, TAction>` contract.

Shopping-specific normalized records are emitted by adapters, for example:

- `RetailerListingRecord`
- `PriceObservationRecord`
- `OfferRecord`

Shopping-specific actions may include only provider-supported operations, for example:

- `RevalidateBasketAction`
- `PrepareCheckoutHandoffAction`

Capabilities must truthfully describe what the connector can do. A read-only offers connector must not advertise checkout write support.

Connector health uses the existing AGNES health states: connected, degraded, auth expired, rate limited, error, or disconnected.

## 9. Import and Normalization Flow

1. Connector sync fetches provider records.
2. Adapter maps provider DTOs into normalized shopping records.
3. Import service validates normalized records with typed schemas.
4. Product matcher links or creates canonical products.
5. Retailer listings are upserted idempotently.
6. Price observations are appended only when a materially new observation exists.
7. Offers are upserted by stable provider identity where possible.
8. Import result emits shopping domain events through the transactional outbox.
9. Connector health and sync cursor are updated.

The import pipeline must tolerate one malformed record without discarding an otherwise valid sync batch. Invalid records are auditable.

## 10. Offers-First Ranking

The Supermarket home ranks opportunities using deterministic signals before AI commentary.

Initial ranking components:

- discount depth when reference price is trustworthy;
- absolute euro saving;
- unit-price attractiveness;
- expiry urgency;
- household relevance from shopping-list/favorite/frequent-item signals when available;
- source freshness;
- product-match confidence;
- retailer practicality.

Misleading percentage discounts are suppressed when AGNES lacks a trustworthy reference price.

The presentation contract exposes reason codes such as:

- `best_price`
- `large_saving`
- `expires_soon`
- `on_household_list`
- `frequently_bought`
- `better_unit_price`

## 11. Basket Comparison and Optimization

AGNES computes at least two strategies:

1. **Single-retailer basket** — one retailer supplies all satisfiable items.
2. **Split basket** — items are allocated across retailers to reduce total cost.

The optimizer includes available fee estimates and does not recommend a second retailer for trivial savings.

Configuration includes:

- minimum split-basket saving in euros;
- optional household travel/friction penalty;
- maximum retailer count per quote;
- substitution policy.

Default v1 recommendation policy:

- prefer one retailer unless the split basket produces a materially greater total saving after known fees;
- never present unavailable items as included in a complete quote;
- show unresolved items explicitly.

## 12. Checkout Model A

The checkout experience remains inside AGNES until a provider-controlled step is required.

### 12.1 Flow

1. User reviews the AGNES basket.
2. AGNES computes the preferred quote.
3. User chooses `Continue to order`.
4. AGNES revalidates price and availability for the selected retailer segment where supported.
5. If values changed materially, AGNES shows the differences and requires the user to accept the updated quote.
6. AGNES creates a CheckoutSession.
7. If an official direct checkout API exists, AGNES may use it only after explicit user confirmation and within provider terms.
8. If a supported prefilled-cart mechanism exists, AGNES creates the handoff with as much basket state as officially supported.
9. Otherwise AGNES opens the retailer checkout/order surface at the final handoff stage and clearly states which items still require confirmation there.
10. AGNES does not mark the order `confirmed` without provider confirmation.

### 12.2 Payment boundary

For v1, retailer-controlled payment credentials and payment authorization remain with the retailer. AGNES does not store supermarket card credentials.

### 12.3 Multi-retailer basket

A split basket produces one checkout session per retailer segment. AGNES presents the combined expected saving before the user begins handoff.

## 13. Presentation Contract

The backend exposes a presentation-neutral Supermarket home model suitable for web, mobile, tablet, TV, or a WordPress shell.

The initial home order is:

1. `Top offers now`
2. `Ending soon`
3. `Your list is cheaper here`
4. `Best basket opportunity`
5. retailer/category filters
6. regular catalogue/search

Each offer card can expose:

- product image;
- product and brand;
- retailer;
- current price;
- reference price when trusted;
- euro saving;
- discount percent when trusted;
- unit price;
- expiry;
- freshness;
- reason badge;
- add-to-basket action.

### 13.1 Seasonal presentation metadata

The API may expose a `seasonalTheme` object derived from locale/date and optional campaign metadata:

- `seasonKey`
- `accentFamily`
- `backgroundMood`
- `heroContext`

Examples of season keys:

- `late_summer`
- `autumn`
- `christmas`
- `winter`
- `spring`
- `easter`
- `summer`

Exact colors, artwork, animation, and photography belong to the presentation layer and may change without changing shopping contracts.

## 14. Application Interfaces

Initial application use cases:

- `RefreshRetailerData`
- `ListTopOffers`
- `SearchProducts`
- `AddBasketItem`
- `RemoveBasketItem`
- `QuoteBasket`
- `OptimizeBasket`
- `RevalidateBasketQuote`
- `PrepareCheckout`
- `GetPriceHistory`

Suggested HTTP contracts, once exposed by the presentation transport:

- `GET /shopping/offers`
- `GET /shopping/products/search?q=`
- `GET /shopping/products/:id/prices`
- `GET /shopping/baskets/:id`
- `POST /shopping/baskets`
- `POST /shopping/baskets/:id/items`
- `DELETE /shopping/baskets/:id/items/:itemId`
- `POST /shopping/baskets/:id/quote`
- `POST /shopping/baskets/:id/checkout`

Transport handlers call application services; they do not contain provider logic.

## 15. Domain Events

Initial versioned events:

- `shopping.retailer_listing.observed.v1`
- `shopping.price.observed.v1`
- `shopping.offer.observed.v1`
- `shopping.basket.created.v1`
- `shopping.basket.updated.v1`
- `shopping.basket.quoted.v1`
- `shopping.checkout.prepared.v1`
- `shopping.checkout.handoff_started.v1`

Events contain stable AGNES identifiers and minimal provider references needed for audit; they do not contain payment credentials.

## 16. Persistence

PostgreSQL remains the cloud-authoritative persistence layer.

Initial shopping tables:

- `shopping_retailers`
- `shopping_products`
- `shopping_retailer_listings`
- `shopping_price_observations`
- `shopping_offers`
- `shopping_lists`
- `shopping_list_items`
- `shopping_baskets`
- `shopping_basket_items`
- `shopping_basket_quotes`
- `shopping_checkout_sessions`
- `shopping_product_matches`
- `shopping_import_failures`

Write operations that publish domain events use the existing transactional outbox pattern.

## 17. Freshness and Error Handling

Every current-price or current-offer result carries observation time and freshness classification.

Freshness classes:

- `live_or_recent`
- `stale`
- `unknown`

Rules:

- stale data may remain visible for context but is labeled;
- stale data is not sufficient for final checkout validation;
- connector errors do not delete the last known observations;
- partial retailer outages degrade only the affected retailer/source;
- quote computation reports unresolved items instead of inventing prices;
- provider parsing failures are captured in `shopping_import_failures` with safe diagnostic metadata.

## 18. Audit and Trust

Audit records cover:

- connector sync start/result;
- rejected import records;
- product-match decisions above configured audit threshold;
- basket quote creation;
- optimizer recommendation and reason;
- price/availability changes during revalidation;
- checkout handoff creation and initiation.

AGNES always distinguishes:

- observed price;
- estimated basket total;
- revalidated total;
- retailer-confirmed order total.

## 19. Testing Strategy

### Domain tests

- exact vs alternative product matching;
- unit normalization;
- offer validity/freshness;
- deterministic ranking;
- single-retailer vs split-basket optimization;
- minimum-saving threshold behavior;
- stale quote rejection.

### Adapter contract tests

- provider fixture -> normalized record mapping;
- idempotent repeat sync;
- malformed-record isolation;
- connector health transitions;
- pagination/cursor behavior where applicable.

### Persistence tests

- idempotent listing upsert;
- immutable price observation history;
- basket transaction integrity;
- outbox event creation in the same transaction.

### End-to-end vertical slice

A verified v1 test will demonstrate:

`provider fixture -> connector sync -> canonical product/listing -> current offer -> AGNES basket -> quote -> checkout preparation/handoff`

No live retailer purchase is performed by automated tests.

## 20. Implementation Sequence

The implementation is intentionally incremental so every stage produces testable software.

1. Shopping domain types, schemas, repositories, and migrations.
2. Normalized shopping connector record contracts and fake connector.
3. Import/normalization pipeline with idempotent persistence and events.
4. AlphaMega catalogue/offers adapter using a verified supported source.
5. e-Kalathi comparison adapter using a verified supported source.
6. Lidl offers adapter using a verified supported source.
7. Offers-first ranking service.
8. Basket and basket-quote service.
9. Product matcher and alternative-product support.
10. Split-basket optimizer with minimum-saving policy.
11. Checkout-session revalidation and retailer handoff.
12. Presentation-neutral Supermarket home API including seasonal-theme metadata.
13. End-to-end verification and operational documentation.

## 21. Acceptance Criteria

Supermarket v1 is considered complete when all of the following are true:

1. AGNES can ingest and persist normalized shopping data from at least one real supported retailer source plus one comparison source.
2. Repeated imports are idempotent and preserve immutable price history.
3. The system can present current offers ordered by deterministic value/relevance signals.
4. A household basket can be quoted against available retailer data.
5. AGNES can distinguish exact matches from comparable alternatives.
6. Split-basket recommendations respect a minimum-saving threshold.
7. Checkout preparation revalidates data where supported and creates an auditable CheckoutSession.
8. Payment remains provider-controlled unless a future official API explicitly supports a safe alternative.
9. The Supermarket home contract is Offers-first and includes seasonal presentation metadata.
10. An end-to-end automated test proves the provider-to-checkout-preparation vertical slice.
11. `npm run check` passes on Node.js 24 with the repository's PostgreSQL test environment.

## 22. Future Extensions

Deferred extensions include:

- additional Cyprus supermarkets;
- loyalty/rewards accounts through supported integrations;
- card/cashback optimization;
- delivery-slot comparison;
- recurring household staples;
- household consumption prediction;
- voice list entry;
- barcode scanning;
- order-status connectors;
- recipe-to-basket generation;
- opportunity notifications for frequently purchased products;
- direct provider checkout if/when officially supported.
