# AGNES Supermarket v1 Operations

## Purpose

AGNES Supermarket is a provider-independent shopping subsystem inside the AGNES Personal & Family Operating System. It ingests public/official retailer and comparison data, persists canonical products/listings/prices/offers, ranks useful offers first, builds household baskets, compares retailer allocation, and prepares a retailer-controlled checkout handoff.

The v1 checkout model is **Model A**: AGNES owns discovery, basket, comparison, optimization, and pre-handoff revalidation where supported. Retailer payment credentials, payment authorization, delivery acceptance, and final order confirmation remain with the retailer unless an official provider API explicitly supports a safe alternative.

## Database setup

Apply migrations in order:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/persistence/migrations/002_shopping.sql
```

CI applies both migrations before lint/build/tests.

## Retailer sources

Initial connectors:

- `shopping-alphamega-cy` — AlphaMega public e-commerce surface. Read capability plus retailer checkout handoff. It does not claim direct checkout or prefilled-cart support unless an official supported mechanism is added later.
- `shopping-lidl-cy` — Lidl Cyprus public offers surface. Read-only in v1; it does not advertise online checkout handoff.
- `shopping-e-kalathi-cy` — e-Kalathi comparison surface. Read-only comparison source; never treated as a checkout retailer.

Source fetches use a bounded timeout and descriptive AGNES user agent. Connectors do not bypass access controls, CAPTCHAs, authentication requirements, or unpublished/private endpoints.

## Refresh flow

Trigger a source refresh through:

```http
POST /shopping/refresh
```

The refresh service processes retailers independently. A failed or unsupported source returns a `degraded` result for that source while other sources continue. Last-known persisted observations are retained.

If a reachable page contains no structured product data supported by the conservative parser, the connector reports `degraded` instead of inventing records.

## Shopping API

Current routes:

```text
GET    /shopping/home
POST   /shopping/refresh
GET    /shopping/offers
GET    /shopping/products/search?q=
GET    /shopping/products/:id/prices
POST   /shopping/baskets
GET    /shopping/baskets/:id
POST   /shopping/baskets/:id/items
DELETE /shopping/baskets/:id/items/:itemId
POST   /shopping/baskets/:id/quote
POST   /shopping/baskets/:id/checkout
```

The Supermarket home is Offers-first and returns seasonal presentation metadata. On 31 August the default presentation family is `late_summer`; later dates select autumn, Christmas, winter, spring, or summer metadata without changing shopping logic.

## Basket policy

Basket quotes use current AGNES observations and exclude e-Kalathi as a checkout retailer. The default optimizer does not recommend a second retailer unless the split basket saves at least EUR 3 after configured friction/fees. Quotes expire after 15 minutes. Observations older than 48 hours make the quote stale.

Unresolved products remain explicit. AGNES does not present missing products as part of a complete quote.

## Checkout handoff

Checkout preparation requires:

1. an unexpired quote;
2. no unresolved basket items;
3. a retailer that truthfully advertises checkout-handoff support;
4. a connector with an executable handoff action.

The service attempts provider revalidation where the connector supports it, then creates a `CheckoutSession`. A generic retailer handoff may contain zero prefilled items when the retailer exposes no official prefilled-cart mechanism.

AGNES must never mark an order as retailer-confirmed merely because a checkout session or handoff URL was created.

## Source freshness and trust

Each imported price/offer stores provenance and observation time. Current-offer ranking favors fresh observations; stale offers receive a strong ranking penalty and are never sufficient for final checkout validation.

Price history is append-only for materially changed observations. Repeated identical imports do not create duplicate history points.

## Verification

Release verification is performed by the GitHub workflows and includes:

```bash
npm run lint
npm run build
npm test
npm test -- tests/e2e/calendar-to-notification.test.ts
npm test -- tests/e2e/supermarket-provider-to-checkout.test.ts
npm run format:check
```

No automated test performs a live retailer purchase.

## Known provider boundary

Public retailer page structures can change. When an official/public page stops exposing supported structured product data, the affected connector degrades cleanly and requires an adapter update. The system must not respond by scraping private APIs or bypassing retailer controls.
