# AGNES Supermarket v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified AGNES Supermarket backend vertical slice that ingests supported AlphaMega/Lidl/e-Kalathi data, ranks offers first, maintains a canonical household basket, optimizes retailer allocation, revalidates before checkout, and prepares retailer-controlled checkout handoff without storing payment credentials.

**Architecture:** Add a provider-independent `shopping` module to the existing modular TypeScript core. Provider-specific retrieval/parsing stays under `src/integrations/shopping`, canonical state is persisted in PostgreSQL, durable shopping events use the existing transactional outbox, and Fastify exposes presentation-neutral shopping contracts only after domain/application behavior is verified.

**Tech Stack:** Node.js 24, TypeScript 6, npm, Fastify 5, PostgreSQL 18-compatible SQL, `pg`, Zod 4, Vitest 3, ESLint, Prettier, built-in Node `fetch`. Do not add a browser-automation or HTML-scraping dependency in v1; adapters parse narrowly-scoped public source documents through injected source-fetcher ports and fixture-backed contract tests.

**Spec:** `docs/superpowers/specs/2026-08-31-agnes-supermarket-v1-design.md`

## Global Constraints

- AGNES remains one coherent Personal & Family Operating System; Supermarket is a module, not a separate app or WordPress plugin.
- Checkout model is **Model A**: AGNES owns discovery, basket, comparison, optimization, and revalidation; retailer payment/confirmation remains provider-controlled unless an official provider API explicitly supports more.
- The Supermarket home is **Offers first**.
- Seasonal colors/artwork are presentation metadata; no permanent purple-only supermarket theme is encoded into domain logic.
- Domain/application code must not import provider-specific DTOs, URLs, Fastify, PostgreSQL clients, or provider SDKs.
- Retailer truth remains authoritative for price, stock, delivery slots, payment, and order acceptance.
- Do not use undocumented/private checkout endpoints, credential scraping, CAPTCHA bypass, or automated payment.
- Current prices/offers carry provenance, observation time, and freshness classification.
- Low-confidence product matches may be alternatives but must not drive exact-product savings claims.
- Repeated imports must be idempotent; price history remains immutable.
- Shopping writes that emit durable events use the existing transactional outbox.
- One malformed provider record must not discard the rest of a valid sync batch.
- Provider connectors advertise truthful capabilities and degrade cleanly when a source is unavailable or unsuitable for automated retrieval.
- No automated test performs a live retailer purchase.
- Node.js runtime remains `>=24 <25`; existing `npm run check` remains the release gate.
- Every implementation task follows TDD: failing test, verify failure, minimal implementation, verify pass, commit.

## Verified Source Baseline (2026-08-31)

Use only these public/official surfaces unless a stronger official integration is explicitly documented during implementation:

- AlphaMega: `https://www.alphamega.com.cy/` — public e-commerce pages expose product identifiers, titles, current prices, unit prices, reference prices/discounts, offer validity, cart affordances, and online ordering.
- Lidl Cyprus: `https://www.lidl.com.cy/el-CY/` and `https://www.lidl.com.cy/c/el-CY/fylladio-lidl/s10022562` — public current offers/leaflet surfaces expose offer products, prices, validity context, and Lidl Plus/public promotion metadata. v1 does not assume a complete online grocery catalogue or checkout API.
- e-Kalathi: `https://www.e-kalathi.gov.cy/product` plus the official Gov.cy service description — comparison source only; it is explicitly not an online store.

Each production adapter must use a conservative fetch cadence, descriptive user agent, bounded timeout, and source-compliance metadata. If a source begins blocking automated retrieval or published terms prohibit the chosen acquisition path, return `degraded` and keep last-known data rather than bypassing controls.

## File Structure

```text
src/
  shopping/
    shopping-types.ts                 # canonical entities/value types
    shopping-schemas.ts               # Zod validation for normalized imports/commands
    shopping-repository.ts            # provider-independent persistence port
    unit-normalization.ts             # package/unit normalization helpers
    product-matcher.ts                # exact/alternative product identity decisions
    import-shopping-records.ts        # normalized import use case + audit failures
    offer-ranking.ts                  # deterministic Offers-first ranking/freshness
    basket-service.ts                 # basket mutations and retailer quote construction
    basket-optimizer.ts               # single vs split basket policy
    checkout-service.ts               # revalidation + CheckoutSession preparation
    supermarket-home.ts               # presentation-neutral home model + seasonal metadata
  integrations/shopping/
    shopping-records.ts               # normalized connector record union/actions
    source-fetcher.ts                  # bounded text-fetch port + Node fetch adapter
    fake-shopping-connector.ts         # deterministic fixture connector
    alphamega-connector.ts             # AlphaMega public-source adapter
    ekalathi-connector.ts              # e-Kalathi comparison adapter
    lidl-connector.ts                  # Lidl public-offers adapter
    fixtures/
      alphamega-home.html
      ekalathi-products.html
      lidl-offers.html
  persistence/
    migrations/002_shopping.sql
    postgres-shopping-repository.ts
  transport/
    shopping-routes.ts
  app/
    build-app.ts                       # wire shopping repository/services/connectors

tests/
  unit/
    shopping-types.test.ts
    unit-normalization.test.ts
    product-matcher.test.ts
    shopping-connectors.test.ts
    offer-ranking.test.ts
    basket-optimizer.test.ts
    checkout-service.test.ts
    supermarket-home.test.ts
    shopping-routes.test.ts
  integration/
    postgres-shopping-repository.test.ts
    import-shopping-records.test.ts
  e2e/
    supermarket-provider-to-checkout.test.ts

docs/
  supermarket-v1-operations.md
```

---

### Task 1: Canonical Shopping Domain and Validation

**Files:**
- Create: `src/shopping/shopping-types.ts`
- Create: `src/shopping/shopping-schemas.ts`
- Test: `tests/unit/shopping-types.test.ts`

**Interfaces:**
- Consumes: existing branded/string IDs and `Clock` conventions from `src/kernel`.
- Produces: canonical `Retailer`, `Product`, `RetailerListing`, `PriceObservation`, `Offer`, `ShoppingList`, `ShoppingListItem`, `Basket`, `BasketItem`, `BasketQuote`, `CheckoutSession`, freshness/match/substitution enums, and Zod schemas used by all later tasks.

- [ ] **Step 1: Write the failing domain-validation test**

```ts
import { describe, expect, it } from 'vitest';
import { priceObservationRecordSchema } from '../../src/shopping/shopping-schemas.js';

describe('shopping schemas', () => {
  it('accepts a EUR price observation with provenance and rejects negative price', () => {
    const valid = priceObservationRecordSchema.parse({
      kind: 'price',
      retailerSlug: 'alphamega-cy',
      externalId: '858031',
      price: 3.99,
      currency: 'EUR',
      referencePrice: 4.99,
      unitPrice: 6.65,
      unitBasis: '1kg',
      observedAt: '2026-08-31T13:00:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
    });

    expect(valid.price).toBe(3.99);
    expect(() => priceObservationRecordSchema.parse({ ...valid, price: -1 })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/unit/shopping-types.test.ts`

Expected: FAIL because `shopping-schemas.ts` and canonical shopping types do not exist.

- [ ] **Step 3: Define the canonical types**

`shopping-types.ts` must define exact string unions and money/freshness contracts used across tasks:

```ts
export type RetailerSlug = 'alphamega-cy' | 'lidl-cy' | 'e-kalathi-cy';
export type CurrencyCode = 'EUR';
export type Freshness = 'live_or_recent' | 'stale' | 'unknown';
export type ListingAvailability = 'available' | 'unavailable' | 'unknown';
export type MatchMethod = 'gtin' | 'provider_mapping' | 'normalized_identity' | 'fuzzy_alternative';
export type SubstitutionPolicy = 'exact_only' | 'allow_equivalent' | 'allow_any';
export type BasketStrategy = 'single_retailer' | 'split_retailer';
export type CheckoutMode = 'direct_provider_api' | 'prefilled_handoff' | 'retailer_handoff';
export type CheckoutStatus = 'prepared' | 'handoff_started' | 'provider_confirmed' | 'expired' | 'cancelled';

export interface Provenance {
  readonly sourceUrl: string;
  readonly acquisition: 'public_web' | 'official_api' | 'official_feed';
  readonly sourceUpdatedAt?: Date;
}

export interface PriceObservation {
  readonly id: string;
  readonly retailerListingId: string;
  readonly price: number;
  readonly currency: CurrencyCode;
  readonly referencePrice?: number;
  readonly unitPrice?: number;
  readonly unitBasis?: string;
  readonly promotionId?: string;
  readonly observedAt: Date;
  readonly sourceUpdatedAt?: Date;
  readonly provenance: Provenance;
}
```

Define the remaining entities exactly from the approved spec, using `Date` for canonical in-process timestamps and strings only at transport/connector validation boundaries.

- [ ] **Step 4: Add Zod normalized-record schemas**

`shopping-schemas.ts` must validate connector-boundary records before domain/application code sees them:

```ts
import { z } from 'zod';

const provenanceSchema = z.object({
  sourceUrl: z.string().url(),
  acquisition: z.enum(['public_web', 'official_api', 'official_feed']),
  sourceUpdatedAt: z.string().datetime().optional(),
});

export const priceObservationRecordSchema = z.object({
  kind: z.literal('price'),
  retailerSlug: z.enum(['alphamega-cy', 'lidl-cy', 'e-kalathi-cy']),
  externalId: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.literal('EUR'),
  referencePrice: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  unitBasis: z.string().min(1).optional(),
  promotionId: z.string().min(1).optional(),
  observedAt: z.string().datetime(),
  sourceUpdatedAt: z.string().datetime().optional(),
  provenance: provenanceSchema,
});
```

Add corresponding listing and offer schemas plus a discriminated union `shoppingRecordSchema` on `kind`.

- [ ] **Step 5: Run unit tests and typecheck**

Run:

```bash
npm test -- tests/unit/shopping-types.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shopping tests/unit/shopping-types.test.ts
git commit -m "feat: define canonical shopping domain"
```

---

### Task 2: Shopping PostgreSQL Schema and Repository

**Files:**
- Create: `src/shopping/shopping-repository.ts`
- Create: `src/persistence/migrations/002_shopping.sql`
- Create: `src/persistence/postgres-shopping-repository.ts`
- Test: `tests/integration/postgres-shopping-repository.test.ts`

**Interfaces:**
- Consumes: Task 1 canonical types; existing `pg` pool/transaction pattern and `OutboxRepository.append(tx, event)`.
- Produces: `ShoppingRepository` and `PostgresShoppingRepository` methods for retailer/listing/product/observation/offer persistence, basket state, quotes, checkout sessions, match decisions, import failures, and price history.

- [ ] **Step 1: Write the failing idempotency/history integration test**

```ts
import { afterAll, expect, it } from 'vitest';
import { pool } from '../../src/persistence/postgres.js';
import { PostgresShoppingRepository } from '../../src/persistence/postgres-shopping-repository.js';

const repository = new PostgresShoppingRepository(pool);

afterAll(async () => pool.end());

it('upserts one retailer listing and preserves distinct price observations', async () => {
  const retailer = await repository.upsertRetailer({
    slug: 'alphamega-cy',
    displayName: 'AlphaMega',
    countryCode: 'CY',
    supportsCatalogue: true,
    supportsOffers: true,
    supportsBasketRevalidation: true,
    supportsCheckoutHandoff: true,
    supportsDirectCheckout: false,
    status: 'active',
  });

  const product = await repository.createProduct({
    canonicalName: 'Test Milk 1 L',
    category: 'milk',
    gtin: '5290000000001',
    status: 'active',
  });

  const first = await repository.upsertListing({
    productId: product.id,
    retailerId: retailer.id,
    externalId: 'milk-1',
    sourceName: 'alphamega',
    title: 'Test Milk 1 L',
    gtin: '5290000000001',
    availability: 'available',
    lastObservedAt: new Date('2026-08-31T10:00:00Z'),
  });
  const second = await repository.upsertListing({ ...first, title: 'Test Milk 1L' });

  expect(second.id).toBe(first.id);

  await repository.appendPriceObservation({
    retailerListingId: first.id,
    price: 1.49,
    currency: 'EUR',
    observedAt: new Date('2026-08-31T10:00:00Z'),
    provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
  });
  await repository.appendPriceObservation({
    retailerListingId: first.id,
    price: 1.39,
    currency: 'EUR',
    observedAt: new Date('2026-08-31T12:00:00Z'),
    provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
  });

  expect(await repository.getPriceHistory(product.id)).toHaveLength(2);
});
```

- [ ] **Step 2: Run the integration test and verify failure**

Run: `npm test -- tests/integration/postgres-shopping-repository.test.ts`

Expected: FAIL because migration/repository do not exist.

- [ ] **Step 3: Add migration `002_shopping.sql`**

The migration must create the 13 tables from the spec with foreign keys and these critical constraints/indexes:

```sql
create unique index shopping_retailers_slug_uq
  on shopping_retailers(slug);

create unique index shopping_retailer_listings_external_uq
  on shopping_retailer_listings(retailer_id, external_id);

create index shopping_price_observations_listing_time_idx
  on shopping_price_observations(retailer_listing_id, observed_at desc);

create unique index shopping_offers_provider_identity_uq
  on shopping_offers(retailer_listing_id, provider_offer_id)
  where provider_offer_id is not null;

create index shopping_basket_items_basket_idx
  on shopping_basket_items(basket_id);

create index shopping_checkout_sessions_basket_idx
  on shopping_checkout_sessions(basket_id, created_at desc);
```

Store money as `numeric(12,4)`, timestamps as `timestamptz`, structured segments/provenance as `jsonb`, and use UUID primary keys consistent with Core v1.

- [ ] **Step 4: Define the repository port**

`shopping-repository.ts` must expose explicit methods, not a generic CRUD bag:

```ts
export interface ShoppingRepository {
  upsertRetailer(input: NewRetailer): Promise<Retailer>;
  findRetailerBySlug(slug: RetailerSlug): Promise<Retailer | null>;
  createProduct(input: NewProduct): Promise<Product>;
  findProductByGtin(gtin: string): Promise<Product | null>;
  searchProducts(query: string, limit: number): Promise<readonly Product[]>;
  upsertListing(input: NewRetailerListing): Promise<RetailerListing>;
  findListing(retailerSlug: RetailerSlug, externalId: string): Promise<RetailerListing | null>;
  appendPriceObservation(input: NewPriceObservation): Promise<PriceObservation>;
  upsertOffer(input: NewOffer): Promise<Offer>;
  listCurrentOffers(now: Date): Promise<readonly OfferWithListing[]>;
  getPriceHistory(productId: string): Promise<readonly PriceObservation[]>;
  saveProductMatch(input: NewProductMatch): Promise<void>;
  saveImportFailure(input: NewImportFailure): Promise<void>;
  createBasket(input: NewBasket): Promise<Basket>;
  getBasket(id: string): Promise<BasketWithItems | null>;
  addBasketItem(input: NewBasketItem): Promise<BasketItem>;
  removeBasketItem(basketId: string, itemId: string): Promise<void>;
  saveBasketQuote(input: NewBasketQuote): Promise<BasketQuote>;
  saveCheckoutSession(input: NewCheckoutSession): Promise<CheckoutSession>;
}
```

- [ ] **Step 5: Implement PostgreSQL methods with explicit mapping**

Use parameterized SQL and parse `numeric` values with `Number(row.price)` at the adapter boundary. `appendPriceObservation` must skip an exact duplicate observation identified by `(retailer_listing_id, price, reference_price, unit_price, observed_at, provenance source URL)` while preserving materially changed observations.

- [ ] **Step 6: Run migration-backed tests and quality gates**

Run:

```bash
npm test -- tests/integration/postgres-shopping-repository.test.ts
npm run build
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shopping/shopping-repository.ts src/persistence/migrations/002_shopping.sql src/persistence/postgres-shopping-repository.ts tests/integration/postgres-shopping-repository.test.ts
git commit -m "feat: persist shopping state and price history"
```

---

### Task 3: Normalized Shopping Connector Contract and Source Fetcher

**Files:**
- Create: `src/integrations/shopping/shopping-records.ts`
- Create: `src/integrations/shopping/source-fetcher.ts`
- Create: `src/integrations/shopping/fake-shopping-connector.ts`
- Test: `tests/unit/shopping-connectors.test.ts`

**Interfaces:**
- Consumes: existing `Connector<TRecord, TAction>` contract and Task 1 record schemas.
- Produces: normalized `ShoppingRecord`, `ShoppingConnectorAction`, `SourceFetcher`, `NodeSourceFetcher`, and `FakeShoppingConnector`.

- [ ] **Step 1: Write the failing connector contract test**

```ts
import { expect, it } from 'vitest';
import { FakeShoppingConnector } from '../../src/integrations/shopping/fake-shopping-connector.js';

it('reports truthful read-only capabilities and deterministic fixture records', async () => {
  const connector = new FakeShoppingConnector('fake-shopping', [
    {
      kind: 'listing',
      retailerSlug: 'alphamega-cy',
      externalId: '858031',
      title: 'Alphamega Fresh To Go Hamburgers 600 g',
      availability: 'available',
      observedAt: '2026-08-31T10:00:00.000Z',
      provenance: { sourceUrl: 'https://www.alphamega.com.cy/', acquisition: 'public_web' },
    },
  ]);

  await connector.connect();
  expect(connector.capabilities()).toEqual({ read: true, write: false, incrementalSync: true });
  expect((await connector.sync()).records).toHaveLength(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/shopping-connectors.test.ts`

Expected: FAIL because shopping connector files do not exist.

- [ ] **Step 3: Define normalized records/actions**

```ts
export type ShoppingRecord =
  | RetailerListingRecord
  | PriceObservationRecord
  | OfferRecord;

export type ShoppingConnectorAction =
  | { readonly kind: 'revalidate_basket'; readonly items: readonly RevalidationItem[] }
  | { readonly kind: 'prepare_checkout_handoff'; readonly items: readonly HandoffItem[] };
```

Every normalized record includes `retailerSlug`, `externalId`, `observedAt`, and `provenance`. Provider DTOs must not escape adapter files.

- [ ] **Step 4: Implement bounded source fetcher**

```ts
export interface SourceFetcher {
  getText(url: string): Promise<{ readonly status: number; readonly body: string }>;
}

export class NodeSourceFetcher implements SourceFetcher {
  async getText(url: string): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'AGNES-Supermarket/0.1 (+household shopping assistant)' },
      });
      return { status: response.status, body: await response.text() };
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

Do not follow login flows, submit forms, solve CAPTCHAs, or attach user cookies in this fetcher.

- [ ] **Step 5: Implement fake connector health/cursor behavior**

The fake connector starts `disconnected`, becomes `connected` after `connect()`, returns records once for cursor `undefined`, then returns an empty batch with cursor `fixture-v1` when synced again with `fixture-v1`.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- tests/unit/shopping-connectors.test.ts
npm run build
git add src/integrations/shopping tests/unit/shopping-connectors.test.ts
git commit -m "feat: add shopping connector contracts"
```

---

### Task 4: Unit Normalization and Conservative Product Matching

**Files:**
- Create: `src/shopping/unit-normalization.ts`
- Create: `src/shopping/product-matcher.ts`
- Test: `tests/unit/unit-normalization.test.ts`
- Test: `tests/unit/product-matcher.test.ts`

**Interfaces:**
- Consumes: Task 1 product/listing/match types and `ShoppingRepository` lookup methods.
- Produces: `normalizePackageIdentity()`, `ProductMatcher.match()`, and explicit exact-vs-alternative match decisions.

- [ ] **Step 1: Write failing normalization/matching tests**

```ts
import { expect, it } from 'vitest';
import { normalizePackageIdentity } from '../../src/shopping/unit-normalization.js';

it('normalizes metric package sizes without changing quantity meaning', () => {
  expect(normalizePackageIdentity('Milk 1 L')).toMatchObject({ sizeValue: 1, sizeUnit: 'l' });
  expect(normalizePackageIdentity('Yogurt 500 g')).toMatchObject({ sizeValue: 500, sizeUnit: 'g' });
  expect(normalizePackageIdentity('Water 6 x 1.5 L')).toMatchObject({ sizeValue: 9, sizeUnit: 'l' });
});
```

```ts
import { expect, it } from 'vitest';
import { ProductMatcher } from '../../src/shopping/product-matcher.js';

it('prefers exact GTIN and never labels fuzzy alternative as exact', async () => {
  const repository = {
    findProductByGtin: async (gtin: string) => gtin === '5290000000001'
      ? { id: 'p1', canonicalName: 'Milk 1 L', category: 'milk', gtin, status: 'active' as const }
      : null,
    searchProducts: async () => [{ id: 'p2', canonicalName: 'Other Milk 1 L', category: 'milk', status: 'active' as const }],
  };
  const matcher = new ProductMatcher(repository);

  expect((await matcher.match({ title: 'Milk 1 L', gtin: '5290000000001' })).method).toBe('gtin');
  expect((await matcher.match({ title: 'Other Milk 1 L' })).exact).toBe(false);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/unit-normalization.test.ts tests/unit/product-matcher.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement package normalization**

Support `g`, `kg`, `ml`, `l`, `pcs`, and simple multipacks. Normalize comparison bases to grams/millilitres/pieces internally, but retain user-facing package text on listings.

- [ ] **Step 4: Implement deterministic match order**

`ProductMatcher.match()` must execute in this order: exact GTIN → trusted provider mapping → normalized brand/name/size identity → conservative alternative candidate. Return:

```ts
export interface ProductMatchDecision {
  readonly productId?: string;
  readonly method: MatchMethod;
  readonly confidence: number;
  readonly exact: boolean;
  readonly reason: string;
}
```

Use thresholds `>= 0.98` for normalized exact identity and `>= 0.85` only for labeled alternatives. No fuzzy result below `0.85` is accepted.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/unit/unit-normalization.test.ts tests/unit/product-matcher.test.ts
npm run build
git add src/shopping/unit-normalization.ts src/shopping/product-matcher.ts tests/unit/unit-normalization.test.ts tests/unit/product-matcher.test.ts
git commit -m "feat: match shopping products conservatively"
```

---

### Task 5: Idempotent Import Pipeline and Durable Shopping Events

**Files:**
- Create: `src/shopping/import-shopping-records.ts`
- Modify: `src/events/agnes-event.ts`
- Test: `tests/integration/import-shopping-records.test.ts`

**Interfaces:**
- Consumes: `ShoppingRecord`, Zod schemas, `ProductMatcher`, `ShoppingRepository`, `OutboxRepository`, `withTransaction`/PostgreSQL transaction conventions.
- Produces: `ImportShoppingRecords.execute(connector, cursor?)` returning accepted/rejected counts and next cursor; versioned shopping event payload types.

- [ ] **Step 1: Write the failing partial-batch/idempotency test**

```ts
it('imports valid records, audits one invalid record, and does not duplicate listing on repeat sync', async () => {
  const connector = new FakeShoppingConnector('fixture', [validListing, invalidNegativePrice, validOffer]);
  const result = await importer.execute(connector);

  expect(result.accepted).toBe(2);
  expect(result.rejected).toBe(1);

  await importer.execute(connector);
  expect(await repository.countListings('alphamega-cy')).toBe(1);
  expect(await repository.countImportFailures()).toBe(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/integration/import-shopping-records.test.ts`

Expected: FAIL because importer/events are absent.

- [ ] **Step 3: Add shopping event types**

Extend the `AgnesEvent` type union/envelope support with these versioned names and minimal payloads:

```ts
export type ShoppingEventType =
  | 'shopping.retailer_listing.observed.v1'
  | 'shopping.price.observed.v1'
  | 'shopping.offer.observed.v1'
  | 'shopping.basket.created.v1'
  | 'shopping.basket.updated.v1'
  | 'shopping.basket.quoted.v1'
  | 'shopping.checkout.prepared.v1'
  | 'shopping.checkout.handoff_started.v1';
```

Do not include payment credentials or raw full provider documents in event payloads.

- [ ] **Step 4: Implement record-by-record validation/import**

Pseudo-code must be implemented literally as separate guarded record processing, not one all-or-nothing parse:

```ts
for (const raw of sync.records) {
  const parsed = shoppingRecordSchema.safeParse(raw);
  if (!parsed.success) {
    await repository.saveImportFailure(toSafeFailure(raw, parsed.error));
    rejected += 1;
    continue;
  }
  await importOne(parsed.data);
  accepted += 1;
}
```

Listing import uses `ProductMatcher`; price import appends immutable observation; offer import upserts stable offer identity. Each successful state-changing write appends its event in the same PostgreSQL transaction.

- [ ] **Step 5: Verify idempotency and outbox state**

Add assertions that repeated listing/offer imports do not create duplicate canonical rows and that expected outbox events exist once per material state change.

- [ ] **Step 6: Run and commit**

```bash
npm test -- tests/integration/import-shopping-records.test.ts
npm run build
git add src/shopping/import-shopping-records.ts src/events/agnes-event.ts tests/integration/import-shopping-records.test.ts
git commit -m "feat: import normalized shopping records durably"
```

---

### Task 6: Official/Public Source Adapters for AlphaMega, e-Kalathi, and Lidl

**Files:**
- Create: `src/integrations/shopping/alphamega-connector.ts`
- Create: `src/integrations/shopping/ekalathi-connector.ts`
- Create: `src/integrations/shopping/lidl-connector.ts`
- Create: `src/integrations/shopping/fixtures/alphamega-home.html`
- Create: `src/integrations/shopping/fixtures/ekalathi-products.html`
- Create: `src/integrations/shopping/fixtures/lidl-offers.html`
- Extend test: `tests/unit/shopping-connectors.test.ts`
- Create: `docs/supermarket-v1-operations.md`

**Interfaces:**
- Consumes: `SourceFetcher`, `Connector<ShoppingRecord, ShoppingConnectorAction>`, normalized shopping records.
- Produces: three provider adapters with truthful capabilities, deterministic fixture parsers, source metadata, and clean degraded-state behavior.

- [ ] **Step 1: Capture minimal sanitized fixtures from public official pages**

Fixtures must contain only enough markup/text to cover real observed structures and no user/account data. Include at least:

- AlphaMega product `858031`, current price `3.99`, reference price `4.99`, validity `27/08/2026` to `09/09/2026`.
- Lidl public offer with product name, price, package/validity context from the 31/08/2026 offer surface.
- e-Kalathi product/comparison row from the public product surface containing a stable identity/barcode when exposed plus retailer price entries.

- [ ] **Step 2: Write failing fixture-to-record tests**

```ts
it('maps AlphaMega public product data to listing, price and offer records', async () => {
  const connector = new AlphaMegaConnector(new FixtureSourceFetcher(alphamegaFixture));
  await connector.connect();
  const records = (await connector.sync()).records;

  expect(records).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'listing', retailerSlug: 'alphamega-cy', externalId: '858031' }),
    expect.objectContaining({ kind: 'price', retailerSlug: 'alphamega-cy', price: 3.99, referencePrice: 4.99 }),
    expect.objectContaining({ kind: 'offer', retailerSlug: 'alphamega-cy', discountPercent: 20 }),
  ]));
});
```

Add equivalent e-Kalathi and Lidl assertions. Lidl capabilities are read-only; e-Kalathi is read-only and never checkout-capable.

- [ ] **Step 3: Implement AlphaMega parser/connector**

Use public page content only. Emit listing/price/offer records with source URL and observation time. Capability contract:

```ts
capabilities() {
  return { read: true, write: true, incrementalSync: false };
}
```

`write: true` means only provider-supported shopping actions. In v1, `execute()` may support `prepare_checkout_handoff` by returning the official AlphaMega e-commerce entry URL and may support `revalidate_basket` only for items that can be re-read from the public product/catalogue surface. It must not automate login, cart mutation, or payment through undocumented endpoints.

- [ ] **Step 4: Implement e-Kalathi parser/connector**

Base URL: `https://www.e-kalathi.gov.cy/product`.

Capabilities:

```ts
capabilities() {
  return { read: true, write: false, incrementalSync: false };
}
```

Emit comparison price observations and identity evidence. Never emit checkout actions because the official service is not an online store.

- [ ] **Step 5: Implement Lidl offers parser/connector**

Base public offer URLs are under `https://www.lidl.com.cy/el-CY/` and the official online leaflet path. Capabilities are read-only. Parse explicit Lidl Plus/member price separately by setting `membershipRequired: true`; do not treat a Lidl Plus price as generally available.

- [ ] **Step 6: Implement degraded health behavior**

For non-2xx response, parse breakage, rate limit, or blocked automated access, return a health state of `degraded`, `rate_limited`, or `error` as appropriate and do not delete previously persisted records.

- [ ] **Step 7: Document source compliance/operations**

`docs/supermarket-v1-operations.md` must record for each source: base URL, acquisition method `public_web`, auth `none`, default cadence `daily` for full refresh plus explicit user-triggered revalidation, 10-second request timeout, no cookies/login/CAPTCHA bypass, and the rule to disable/degrade if automated use becomes disallowed.

- [ ] **Step 8: Run fixture tests and commit**

```bash
npm test -- tests/unit/shopping-connectors.test.ts
npm run build
git add src/integrations/shopping docs/supermarket-v1-operations.md tests/unit/shopping-connectors.test.ts
git commit -m "feat: add Cyprus supermarket source adapters"
```

---

### Task 7: Offers Freshness and Offers-First Ranking

**Files:**
- Create: `src/shopping/offer-ranking.ts`
- Test: `tests/unit/offer-ranking.test.ts`

**Interfaces:**
- Consumes: offers/listings/current price observations and household relevance flags.
- Produces: `classifyFreshness()` and `rankOffers()` returning deterministic score + reason codes.

- [ ] **Step 1: Write the failing ranking test**

```ts
it('ranks a current household-list offer above a stale larger headline discount', () => {
  const now = new Date('2026-08-31T12:00:00Z');
  const ranked = rankOffers([
    makeOffer({ id: 'fresh', currentPrice: 3.99, referencePrice: 4.99, endsAt: new Date('2026-09-09T20:59:59Z'), observedAt: now, onHouseholdList: true }),
    makeOffer({ id: 'stale', currentPrice: 2, referencePrice: 4, endsAt: new Date('2026-08-20T20:59:59Z'), observedAt: new Date('2026-08-20T10:00:00Z') }),
  ], now);

  expect(ranked[0]?.offer.id).toBe('fresh');
  expect(ranked[0]?.reasons).toContain('on_household_list');
  expect(ranked[1]?.freshness).toBe('stale');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/offer-ranking.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement freshness rules**

`live_or_recent` requires the offer validity window to include `now` when dates exist and observation age <= 36 hours. Expired offers are `stale`. Missing validity plus observation age > 36 hours is `stale`; otherwise `unknown` when evidence is insufficient.

- [ ] **Step 4: Implement deterministic score**

Use bounded components so one misleading signal cannot dominate:

```ts
score =
  trustedDiscountScore * 0.25 +
  absoluteSavingScore * 0.20 +
  unitValueScore * 0.15 +
  expiryUrgencyScore * 0.10 +
  householdRelevanceScore * 0.20 +
  freshnessScore * 0.10;
```

Only compute discount percentage when `referencePrice > currentPrice` and the reference is marked trustworthy. Reason codes are `best_price`, `large_saving`, `expires_soon`, `on_household_list`, `frequently_bought`, `better_unit_price`.

- [ ] **Step 5: Run and commit**

```bash
npm test -- tests/unit/offer-ranking.test.ts
npm run build
git add src/shopping/offer-ranking.ts tests/unit/offer-ranking.test.ts
git commit -m "feat: rank supermarket offers by real value"
```

---

### Task 8: Basket Service, Retailer Quotes, and Split-Basket Optimizer

**Files:**
- Create: `src/shopping/basket-service.ts`
- Create: `src/shopping/basket-optimizer.ts`
- Test: `tests/unit/basket-optimizer.test.ts`
- Extend integration test: `tests/integration/postgres-shopping-repository.test.ts`

**Interfaces:**
- Consumes: canonical basket/listing/current-price data and `ShoppingRepository`.
- Produces: basket mutations, `quoteBasket()`, `optimizeBasket()`, explicit unresolved items, and a configurable split-saving policy.

- [ ] **Step 1: Write failing optimizer tests**

```ts
it('prefers one retailer when split saving is below the minimum threshold', () => {
  const optimizer = new BasketOptimizer({ minimumSplitSavingEuro: 4, maximumRetailers: 2, frictionPenaltyEuro: 0 });
  const result = optimizer.choose([
    quote('single', 'single_retailer', 40),
    quote('split', 'split_retailer', 37.5),
  ]);
  expect(result.id).toBe('single');
});

it('chooses split basket when saving remains material after fees/friction', () => {
  const optimizer = new BasketOptimizer({ minimumSplitSavingEuro: 4, maximumRetailers: 2, frictionPenaltyEuro: 1 });
  const result = optimizer.choose([
    quote('single', 'single_retailer', 50),
    quote('split', 'split_retailer', 43),
  ]);
  expect(result.id).toBe('split');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/basket-optimizer.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement basket mutations**

`BasketService` must expose:

```ts
createBasket(input: { householdId: string; createdByPersonId: string }): Promise<Basket>;
addItem(input: { basketId: string; productId: string; quantity: number; substitutionPolicy: SubstitutionPolicy }): Promise<BasketItem>;
removeItem(basketId: string, itemId: string): Promise<void>;
quoteBasket(basketId: string, now: Date): Promise<readonly BasketQuote[]>;
```

Quantity must be > 0. Quotes include only available/current listings as resolved items and retain an explicit `unresolvedItems` array.

- [ ] **Step 4: Build single-retailer and split candidates**

For each retailer, compute satisfiable items and subtotal from the latest non-stale price observation. For split strategy, assign each exact-match item to the lowest current total item cost, respect `maximumRetailers`, then add known fees and friction penalty. Alternative matches are used only when the basket item's substitution policy permits them and must be labeled in the quote segment.

- [ ] **Step 5: Implement minimum-saving recommendation policy**

The optimizer compares the cheapest complete single-retailer quote against split candidate. Recommend split only when:

```ts
(single.totalEstimate - split.totalEstimate - frictionPenaltyEuro) >= minimumSplitSavingEuro
```

If no complete quote exists, return the best partial quote with unresolved items and `freshness` reflecting the weakest included price.

- [ ] **Step 6: Persist quote and emit `shopping.basket.quoted.v1`**

Saving a chosen quote must use the existing transaction/outbox boundary.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -- tests/unit/basket-optimizer.test.ts tests/integration/postgres-shopping-repository.test.ts
npm run build
git add src/shopping/basket-service.ts src/shopping/basket-optimizer.ts tests/unit/basket-optimizer.test.ts tests/integration/postgres-shopping-repository.test.ts
git commit -m "feat: quote and optimize supermarket baskets"
```

---

### Task 9: Checkout Model A Revalidation and Retailer Handoff

**Files:**
- Create: `src/shopping/checkout-service.ts`
- Test: `tests/unit/checkout-service.test.ts`

**Interfaces:**
- Consumes: selected `BasketQuote`, retailer connector registry/actions, `ShoppingRepository`, `Clock`.
- Produces: `prepareCheckout()` with per-retailer `CheckoutSession` objects, material-change detection, and handoff start auditing.

- [ ] **Step 1: Write failing revalidation test**

```ts
it('requires acceptance when retailer revalidation changes the total materially', async () => {
  const service = makeCheckoutService({ revalidatedPrice: 4.49 });
  const result = await service.prepareCheckout({
    basketId: 'b1',
    basketQuoteId: 'q1',
    createdByPersonId: 'person1',
    acceptMaterialChanges: false,
  });

  expect(result.status).toBe('changes_require_acceptance');
  expect(result.changes[0]).toMatchObject({ previousPrice: 3.99, currentPrice: 4.49 });
});
```

Add a second test proving that a connector without revalidation support creates `retailer_handoff` with `validatedAt` unset and explicit final-retailer-confirmation warning.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/checkout-service.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement material-change policy**

A material change is any unavailable previously-resolved item or total increase >= `€0.50` or >= `2%`, whichever threshold is reached first. Material changes require explicit acceptance before session creation.

- [ ] **Step 4: Implement checkout mode selection**

Choose in order:

1. `direct_provider_api` only when connector truthfully advertises and implements an official direct checkout action.
2. `prefilled_handoff` only when provider exposes an official supported prefilled-cart mechanism.
3. `retailer_handoff` otherwise.

For AlphaMega v1, default to `retailer_handoff` unless an official supported prefilled mechanism is documented during adapter verification. Lidl v1 is not assumed checkout-capable. e-Kalathi can never produce CheckoutSession.

- [ ] **Step 5: Persist sessions and durable events**

Create one CheckoutSession per retailer segment for split baskets. Emit `shopping.checkout.prepared.v1`; when the user actually follows the returned handoff URL, emit `shopping.checkout.handoff_started.v1`. Never set `provider_confirmed` without provider confirmation.

- [ ] **Step 6: Run and commit**

```bash
npm test -- tests/unit/checkout-service.test.ts
npm run build
git add src/shopping/checkout-service.ts tests/unit/checkout-service.test.ts
git commit -m "feat: prepare safe retailer checkout handoff"
```

---

### Task 10: Offers-First Supermarket Home and Seasonal Metadata

**Files:**
- Create: `src/shopping/supermarket-home.ts`
- Test: `tests/unit/supermarket-home.test.ts`

**Interfaces:**
- Consumes: ranked offers, shopping-list relevance, chosen basket opportunity, locale/date.
- Produces: `getSupermarketHome()` presentation-neutral model ordered exactly as approved, including `seasonalTheme`.

- [ ] **Step 1: Write failing home-order/theme test**

```ts
it('returns offers first and late-summer seasonal metadata on August 31 in Cyprus', async () => {
  const home = await service.getSupermarketHome({
    householdId: 'h1',
    locale: 'el-CY',
    now: new Date('2026-08-31T12:00:00+03:00'),
  });

  expect(home.sections.map((section) => section.key)).toEqual([
    'top_offers_now',
    'ending_soon',
    'your_list_is_cheaper_here',
    'best_basket_opportunity',
    'filters',
    'catalogue_search',
  ]);
  expect(home.seasonalTheme.seasonKey).toBe('late_summer');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/supermarket-home.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement seasonal metadata resolver**

For `el-CY`, use date-based keys: `late_summer` Aug 20-Sep 15, `autumn` Sep 16-Nov 20, `christmas` Nov 21-Jan 6, `winter` Jan 7-Feb end, `spring` Mar 1-May 15 except Easter campaign override, `summer` May 16-Aug 19. Return semantic values only:

```ts
{
  seasonKey: 'late_summer',
  accentFamily: 'sun-washed-citrus-and-sea',
  backgroundMood: 'warm-mediterranean-market',
  heroContext: 'end-of-summer-value'
}
```

Do not encode CSS hex values in backend domain/application code.

- [ ] **Step 4: Build offer cards and ordered sections**

Offer cards expose product image, product/brand, retailer, current/reference price when trusted, euro saving, discount percentage when trusted, unit price, expiry, freshness, reason badges, and add-to-basket identifiers.

- [ ] **Step 5: Run and commit**

```bash
npm test -- tests/unit/supermarket-home.test.ts
npm run build
git add src/shopping/supermarket-home.ts tests/unit/supermarket-home.test.ts
git commit -m "feat: expose offers-first supermarket home model"
```

---

### Task 11: Fastify Shopping API and Composition Root Wiring

**Files:**
- Create: `src/transport/shopping-routes.ts`
- Modify: `src/app/build-app.ts`
- Modify: `src/app/server.ts`
- Test: `tests/unit/shopping-routes.test.ts`
- Extend: `tests/unit/build-app.test.ts`

**Interfaces:**
- Consumes: shopping application services/repository/connectors from Tasks 2-10.
- Produces: the approved HTTP contracts and a composition root exposing shopping services/connectors.

- [ ] **Step 1: Write failing route test**

```ts
it('serves offers-first home and creates a basket item through application handlers', async () => {
  const app = Fastify();
  await registerShoppingRoutes(app, fakeShoppingHandlers);

  const offers = await app.inject({ method: 'GET', url: '/shopping/offers' });
  expect(offers.statusCode).toBe(200);
  expect(offers.json().sections[0].key).toBe('top_offers_now');

  const add = await app.inject({
    method: 'POST',
    url: '/shopping/baskets/b1/items',
    payload: { productId: 'p1', quantity: 2, substitutionPolicy: 'exact_only' },
  });
  expect(add.statusCode).toBe(201);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/unit/shopping-routes.test.ts tests/unit/build-app.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement transport handlers**

Register:

```text
GET    /shopping/offers
GET    /shopping/products/search?q=
GET    /shopping/products/:id/prices
GET    /shopping/baskets/:id
POST   /shopping/baskets
POST   /shopping/baskets/:id/items
DELETE /shopping/baskets/:id/items/:itemId
POST   /shopping/baskets/:id/quote
POST   /shopping/baskets/:id/checkout
```

Validate params/body with Zod. Handlers call application services only; they never fetch retailer pages directly.

- [ ] **Step 4: Wire shopping into `buildApp()`**

Instantiate `PostgresShoppingRepository`, `NodeSourceFetcher`, AlphaMega/Lidl/e-Kalathi connectors, importer, matcher, ranking, basket optimizer, checkout service, and supermarket home service. Register connectors in the existing `ConnectorRegistry` with distinct IDs.

Extend `AgnesApp` with explicit shopping properties needed by transport/tests. `close()` disconnects shopping connectors before ending the pool.

- [ ] **Step 5: Register routes in server startup**

Keep startup thin: build app, create Fastify, register health/notification/shopping routes, then listen. No provider logic belongs in `server.ts`.

- [ ] **Step 6: Run and commit**

```bash
npm test -- tests/unit/shopping-routes.test.ts tests/unit/build-app.test.ts
npm run build
npm run lint
git add src/transport/shopping-routes.ts src/app/build-app.ts src/app/server.ts tests/unit/shopping-routes.test.ts tests/unit/build-app.test.ts
git commit -m "feat: expose supermarket application API"
```

---

### Task 12: End-to-End Provider-to-Checkout Verification and Release Gate

**Files:**
- Create: `tests/e2e/supermarket-provider-to-checkout.test.ts`
- Modify: `docs/supermarket-v1-operations.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete shopping vertical slice.
- Produces: verified acceptance path from provider fixture through checkout preparation, operational runbook, and documented Supermarket v1 status.

- [ ] **Step 1: Write the failing end-to-end test**

```ts
it('imports provider data, surfaces an offer, quotes a basket and prepares retailer handoff', async () => {
  const app = await buildTestAppWithShoppingFixture();

  const importResult = await app.shoppingImporter.execute(app.alphaMegaConnector);
  expect(importResult.accepted).toBeGreaterThan(0);

  const home = await app.supermarketHome.getSupermarketHome({
    householdId: seededHouseholdId,
    locale: 'el-CY',
    now: new Date('2026-08-31T12:00:00+03:00'),
  });
  expect(home.sections[0].key).toBe('top_offers_now');

  const basket = await app.basketService.createBasket({ householdId: seededHouseholdId, createdByPersonId: seededPersonId });
  await app.basketService.addItem({ basketId: basket.id, productId: importedProductId, quantity: 1, substitutionPolicy: 'exact_only' });
  const quotes = await app.basketService.quoteBasket(basket.id, new Date('2026-08-31T12:00:00+03:00'));
  expect(quotes.length).toBeGreaterThan(0);

  const checkout = await app.checkoutService.prepareCheckout({
    basketId: basket.id,
    basketQuoteId: quotes[0]!.id,
    createdByPersonId: seededPersonId,
    acceptMaterialChanges: true,
  });
  expect(checkout.sessions[0]?.mode).toBe('retailer_handoff');
  expect(checkout.sessions[0]?.handoffUrl).toContain('alphamega.com.cy');

  await app.close();
});
```

The test uses deterministic official-page fixtures, never live payment or order submission.

- [ ] **Step 2: Run and verify failure before final wiring corrections**

Run: `npm test -- tests/e2e/supermarket-provider-to-checkout.test.ts`

Expected before final fixes: FAIL on any missing composition/import/quote/checkout contract. Fix only the smallest missing integration behavior until the test passes.

- [ ] **Step 3: Add live-source read-only smoke procedure to operations doc**

Document exact manual command/process for a production-like environment: run one AlphaMega sync, one e-Kalathi sync, one Lidl sync; verify connector health, accepted/rejected counts, provenance, observation age, and zero checkout/payment side effects. If any source is degraded, retain last-known data and surface freshness warning.

- [ ] **Step 4: Update README Supermarket status**

Add a concise section listing the verified flow:

```text
public/official source -> normalized connector records -> canonical products/listings/prices/offers -> Offers-first home -> AGNES basket -> quote/optimizer -> revalidation -> retailer handoff
```

State explicitly that retailer payment remains provider-controlled.

- [ ] **Step 5: Run complete release gates**

Run:

```bash
npm run check
npm run format:check
```

Expected: lint, TypeScript build, all unit/integration/e2e tests, and formatting pass on Node.js 24 with the repository PostgreSQL test environment.

- [ ] **Step 6: Commit verified slice**

```bash
git add tests/e2e/supermarket-provider-to-checkout.test.ts docs/supermarket-v1-operations.md README.md
git commit -m "test: verify supermarket provider-to-checkout slice"
```

## Self-Review Results

- **Spec coverage:** Tasks cover canonical models, persistence, normalized connectors, malformed-record isolation, product matching, immutable price history, AlphaMega/e-Kalathi/Lidl source adapters, Offers-first deterministic ranking, freshness, basket comparison, split optimization threshold, Model A revalidation/handoff, seasonal presentation metadata, transport contracts, audit/outbox events, and the required end-to-end vertical slice.
- **Scope:** Payment credentials, undocumented checkout automation, loyalty credential scraping, broad retailer expansion, delivery-slot comparison, cashback/card optimization, and final production UI remain outside this implementation plan, matching the approved v1 spec.
- **Type consistency:** `RetailerSlug`, `ShoppingRecord`, `ShoppingRepository`, `ProductMatcher`, `BasketQuote`, `CheckoutSession`, and connector action names are defined before later tasks consume them.
- **Safety/compliance:** e-Kalathi is comparison-only; Lidl is read-only in v1; AlphaMega checkout defaults to retailer handoff unless an official supported prefilled/direct mechanism is verified. No task requires private APIs, CAPTCHA bypass, stored retailer passwords, or AGNES-held payment credentials.
