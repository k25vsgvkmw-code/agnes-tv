import { randomUUID } from 'node:crypto';
import type { Pool, QueryResultRow } from 'pg';
import type {
  NewBasket,
  NewBasketItem,
  NewBasketQuote,
  NewCheckoutSession,
  NewImportFailure,
  NewOffer,
  NewPriceObservation,
  NewProduct,
  NewProductMatch,
  NewRetailer,
  NewRetailerListing,
  ShoppingRepository,
} from '../shopping/shopping-repository.js';
import type {
  Basket,
  BasketItem,
  BasketQuote,
  BasketRetailerSegment,
  CheckoutSession,
  Freshness,
  ImportFailure,
  ListingAvailability,
  Offer,
  OfferStatus,
  OfferType,
  PriceObservation,
  Product,
  ProductMatch,
  Retailer,
  RetailerListing,
  RetailerSlug,
} from '../shopping/shopping-types.js';

interface RetailerRow extends QueryResultRow {
  id: string;
  slug: RetailerSlug;
  display_name: string;
  country_code: 'CY';
  supports_catalogue: boolean;
  supports_offers: boolean;
  supports_basket_revalidation: boolean;
  supports_checkout_handoff: boolean;
  supports_direct_checkout: boolean;
  status: 'active' | 'inactive';
}

interface ProductRow extends QueryResultRow {
  id: string;
  canonical_name: string;
  brand: string | null;
  category: string;
  sub_category: string | null;
  gtin: string | null;
  size_value: string | number | null;
  size_unit: string | null;
  image_url: string | null;
  status: 'active' | 'inactive';
}

interface ListingRow extends QueryResultRow {
  id: string;
  product_id: string;
  retailer_id: string;
  external_id: string;
  external_url: string | null;
  source_name: string;
  title: string;
  brand: string | null;
  package_text: string | null;
  image_url: string | null;
  gtin: string | null;
  availability: ListingAvailability;
  last_observed_at: Date;
}

interface PriceRow extends QueryResultRow {
  id: string;
  retailer_listing_id: string;
  price: string | number;
  currency: 'EUR';
  reference_price: string | number | null;
  unit_price: string | number | null;
  unit_basis: string | null;
  promotion_id: string | null;
  observed_at: Date;
  source_updated_at: Date | null;
  provenance: { sourceUrl: string; acquisition: 'public_web' | 'official_api' | 'official_feed' };
}

interface OfferRow extends QueryResultRow {
  id: string;
  retailer_listing_id: string;
  provider_offer_id: string | null;
  offer_type: OfferType;
  headline: string;
  current_price: string | number;
  reference_price: string | number | null;
  discount_percent: string | number | null;
  starts_at: Date | null;
  ends_at: Date | null;
  membership_required: boolean;
  terms_text: string | null;
  observed_at: Date;
  status: OfferStatus;
  provenance: { sourceUrl: string; acquisition: 'public_web' | 'official_api' | 'official_feed' };
}

interface BasketRow extends QueryResultRow {
  id: string;
  household_id: string;
  status: Basket['status'];
  currency: 'EUR';
  created_by_person_id: string;
  created_at: Date;
  updated_at: Date;
}

interface BasketItemRow extends QueryResultRow {
  id: string;
  basket_id: string;
  product_id: string;
  preferred_listing_id: string | null;
  quantity: string | number;
  substitution_policy: BasketItem['substitutionPolicy'];
  selected_retailer_id: string | null;
}

interface QuoteRow extends QueryResultRow {
  id: string;
  basket_id: string;
  strategy: BasketQuote['strategy'];
  retailer_segments: BasketRetailerSegment[];
  unresolved_item_ids: string[];
  items_subtotal: string | number;
  fees_estimate: string | number | null;
  total_estimate: string | number;
  baseline_total: string | number | null;
  estimated_saving: string | number | null;
  quoted_at: Date;
  expires_at: Date;
  freshness: Freshness;
}

function optionalNumber(value: string | number | null): number | undefined {
  if (value === null) return undefined;
  return Number(value);
}

function mapRetailer(row: RetailerRow): Retailer {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    countryCode: row.country_code,
    supportsCatalogue: row.supports_catalogue,
    supportsOffers: row.supports_offers,
    supportsBasketRevalidation: row.supports_basket_revalidation,
    supportsCheckoutHandoff: row.supports_checkout_handoff,
    supportsDirectCheckout: row.supports_direct_checkout,
    status: row.status,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    ...(row.brand ? { brand: row.brand } : {}),
    category: row.category,
    ...(row.sub_category ? { subCategory: row.sub_category } : {}),
    ...(row.gtin ? { gtin: row.gtin } : {}),
    ...(row.size_value !== null ? { sizeValue: Number(row.size_value) } : {}),
    ...(row.size_unit ? { sizeUnit: row.size_unit } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    status: row.status,
  };
}

function mapListing(row: ListingRow): RetailerListing {
  return {
    id: row.id,
    productId: row.product_id,
    retailerId: row.retailer_id,
    externalId: row.external_id,
    ...(row.external_url ? { externalUrl: row.external_url } : {}),
    sourceName: row.source_name,
    title: row.title,
    ...(row.brand ? { brand: row.brand } : {}),
    ...(row.package_text ? { packageText: row.package_text } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    ...(row.gtin ? { gtin: row.gtin } : {}),
    availability: row.availability,
    lastObservedAt: new Date(row.last_observed_at),
  };
}

function mapPrice(row: PriceRow): PriceObservation {
  const referencePrice = optionalNumber(row.reference_price);
  const unitPrice = optionalNumber(row.unit_price);
  return {
    id: row.id,
    retailerListingId: row.retailer_listing_id,
    price: Number(row.price),
    currency: row.currency,
    ...(referencePrice !== undefined ? { referencePrice } : {}),
    ...(unitPrice !== undefined ? { unitPrice } : {}),
    ...(row.unit_basis ? { unitBasis: row.unit_basis } : {}),
    ...(row.promotion_id ? { promotionId: row.promotion_id } : {}),
    observedAt: new Date(row.observed_at),
    ...(row.source_updated_at ? { sourceUpdatedAt: new Date(row.source_updated_at) } : {}),
    provenance: row.provenance,
  };
}

function mapOffer(row: OfferRow): Offer {
  const referencePrice = optionalNumber(row.reference_price);
  const discountPercent = optionalNumber(row.discount_percent);
  return {
    id: row.id,
    retailerListingId: row.retailer_listing_id,
    ...(row.provider_offer_id ? { providerOfferId: row.provider_offer_id } : {}),
    offerType: row.offer_type,
    headline: row.headline,
    currentPrice: Number(row.current_price),
    ...(referencePrice !== undefined ? { referencePrice } : {}),
    ...(discountPercent !== undefined ? { discountPercent } : {}),
    ...(row.starts_at ? { startsAt: new Date(row.starts_at) } : {}),
    ...(row.ends_at ? { endsAt: new Date(row.ends_at) } : {}),
    membershipRequired: row.membership_required,
    ...(row.terms_text ? { termsText: row.terms_text } : {}),
    observedAt: new Date(row.observed_at),
    status: row.status,
    provenance: row.provenance,
  };
}

function mapBasket(row: BasketRow): Basket {
  return {
    id: row.id,
    householdId: row.household_id,
    status: row.status,
    currency: row.currency,
    createdByPersonId: row.created_by_person_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapBasketItem(row: BasketItemRow): BasketItem {
  return {
    id: row.id,
    basketId: row.basket_id,
    productId: row.product_id,
    ...(row.preferred_listing_id ? { preferredListingId: row.preferred_listing_id } : {}),
    quantity: Number(row.quantity),
    substitutionPolicy: row.substitution_policy,
    ...(row.selected_retailer_id ? { selectedRetailerId: row.selected_retailer_id } : {}),
  };
}

function mapQuote(row: QuoteRow): BasketQuote {
  const feesEstimate = optionalNumber(row.fees_estimate);
  const baselineTotal = optionalNumber(row.baseline_total);
  const estimatedSaving = optionalNumber(row.estimated_saving);
  return {
    id: row.id,
    basketId: row.basket_id,
    strategy: row.strategy,
    retailerSegments: row.retailer_segments,
    unresolvedItemIds: row.unresolved_item_ids,
    itemsSubtotal: Number(row.items_subtotal),
    ...(feesEstimate !== undefined ? { feesEstimate } : {}),
    totalEstimate: Number(row.total_estimate),
    ...(baselineTotal !== undefined ? { baselineTotal } : {}),
    ...(estimatedSaving !== undefined ? { estimatedSaving } : {}),
    quotedAt: new Date(row.quoted_at),
    expiresAt: new Date(row.expires_at),
    freshness: row.freshness,
  };
}

export class PostgresShoppingRepository implements ShoppingRepository {
  constructor(private readonly pool: Pool) {}

  async upsertRetailer(input: NewRetailer): Promise<Retailer> {
    const result = await this.pool.query<RetailerRow>(
      `insert into shopping_retailers (
        id, slug, display_name, country_code, supports_catalogue, supports_offers,
        supports_basket_revalidation, supports_checkout_handoff, supports_direct_checkout, status
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (slug) do update set
        display_name = excluded.display_name,
        supports_catalogue = excluded.supports_catalogue,
        supports_offers = excluded.supports_offers,
        supports_basket_revalidation = excluded.supports_basket_revalidation,
        supports_checkout_handoff = excluded.supports_checkout_handoff,
        supports_direct_checkout = excluded.supports_direct_checkout,
        status = excluded.status,
        updated_at = now()
      returning *`,
      [
        randomUUID(), input.slug, input.displayName, input.countryCode, input.supportsCatalogue,
        input.supportsOffers, input.supportsBasketRevalidation, input.supportsCheckoutHandoff,
        input.supportsDirectCheckout, input.status,
      ],
    );
    return mapRetailer(result.rows[0]!);
  }

  async findRetailerBySlug(slug: RetailerSlug): Promise<Retailer | null> {
    const result = await this.pool.query<RetailerRow>('select * from shopping_retailers where slug = $1', [slug]);
    return result.rows[0] ? mapRetailer(result.rows[0]) : null;
  }

  async getRetailer(id: string): Promise<Retailer | null> {
    const result = await this.pool.query<RetailerRow>('select * from shopping_retailers where id = $1', [id]);
    return result.rows[0] ? mapRetailer(result.rows[0]) : null;
  }

  async listRetailers(): Promise<readonly Retailer[]> {
    const result = await this.pool.query<RetailerRow>('select * from shopping_retailers order by display_name');
    return result.rows.map(mapRetailer);
  }

  async createProduct(input: NewProduct): Promise<Product> {
    if (input.gtin) {
      const existing = await this.findProductByGtin(input.gtin);
      if (existing) return existing;
    }
    const result = await this.pool.query<ProductRow>(
      `insert into shopping_products
        (id, canonical_name, brand, category, sub_category, gtin, size_value, size_unit, image_url, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [
        randomUUID(), input.canonicalName, input.brand ?? null, input.category, input.subCategory ?? null,
        input.gtin ?? null, input.sizeValue ?? null, input.sizeUnit ?? null, input.imageUrl ?? null, input.status,
      ],
    );
    return mapProduct(result.rows[0]!);
  }

  async getProduct(id: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>('select * from shopping_products where id = $1', [id]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async findProductByGtin(gtin: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>('select * from shopping_products where gtin = $1', [gtin]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async searchProducts(query: string, limit: number): Promise<readonly Product[]> {
    const result = await this.pool.query<ProductRow>(
      `select * from shopping_products
       where canonical_name ilike $1 or coalesce(brand, '') ilike $1
       order by canonical_name limit $2`,
      [`%${query}%`, limit],
    );
    return result.rows.map(mapProduct);
  }

  async upsertListing(input: NewRetailerListing): Promise<RetailerListing> {
    const result = await this.pool.query<ListingRow>(
      `insert into shopping_retailer_listings
        (id, product_id, retailer_id, external_id, external_url, source_name, title, brand, package_text,
         image_url, gtin, availability, last_observed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (retailer_id, external_id) do update set
         product_id = excluded.product_id,
         external_url = excluded.external_url,
         source_name = excluded.source_name,
         title = excluded.title,
         brand = excluded.brand,
         package_text = excluded.package_text,
         image_url = excluded.image_url,
         gtin = excluded.gtin,
         availability = excluded.availability,
         last_observed_at = excluded.last_observed_at,
         updated_at = now()
       returning *`,
      [
        randomUUID(), input.productId, input.retailerId, input.externalId, input.externalUrl ?? null,
        input.sourceName, input.title, input.brand ?? null, input.packageText ?? null,
        input.imageUrl ?? null, input.gtin ?? null, input.availability, input.lastObservedAt,
      ],
    );
    return mapListing(result.rows[0]!);
  }

  async findListing(retailerSlug: RetailerSlug, externalId: string): Promise<RetailerListing | null> {
    const result = await this.pool.query<ListingRow>(
      `select l.* from shopping_retailer_listings l
       join shopping_retailers r on r.id = l.retailer_id
       where r.slug = $1 and l.external_id = $2`,
      [retailerSlug, externalId],
    );
    return result.rows[0] ? mapListing(result.rows[0]) : null;
  }

  async getListingById(id: string): Promise<RetailerListing | null> {
    const result = await this.pool.query<ListingRow>('select * from shopping_retailer_listings where id = $1', [id]);
    return result.rows[0] ? mapListing(result.rows[0]) : null;
  }

  async listListingsForProduct(productId: string): Promise<readonly RetailerListing[]> {
    const result = await this.pool.query<ListingRow>(
      'select * from shopping_retailer_listings where product_id = $1 order by last_observed_at desc',
      [productId],
    );
    return result.rows.map(mapListing);
  }

  async appendPriceObservation(input: NewPriceObservation): Promise<PriceObservation> {
    const previous = await this.latestPriceForListing(input.retailerListingId);
    if (
      previous &&
      previous.price === input.price &&
      previous.referencePrice === input.referencePrice &&
      previous.unitPrice === input.unitPrice &&
      previous.promotionId === input.promotionId
    ) {
      return previous;
    }
    const result = await this.pool.query<PriceRow>(
      `insert into shopping_price_observations
        (id, retailer_listing_id, price, currency, reference_price, unit_price, unit_basis, promotion_id,
         observed_at, source_updated_at, provenance)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [
        randomUUID(), input.retailerListingId, input.price, input.currency, input.referencePrice ?? null,
        input.unitPrice ?? null, input.unitBasis ?? null, input.promotionId ?? null, input.observedAt,
        input.sourceUpdatedAt ?? null, JSON.stringify(input.provenance),
      ],
    );
    return mapPrice(result.rows[0]!);
  }

  async latestPriceForListing(retailerListingId: string): Promise<PriceObservation | null> {
    const result = await this.pool.query<PriceRow>(
      `select * from shopping_price_observations
       where retailer_listing_id = $1 order by observed_at desc limit 1`,
      [retailerListingId],
    );
    return result.rows[0] ? mapPrice(result.rows[0]) : null;
  }

  async getPriceHistory(productId: string): Promise<readonly PriceObservation[]> {
    const result = await this.pool.query<PriceRow>(
      `select p.* from shopping_price_observations p
       join shopping_retailer_listings l on l.id = p.retailer_listing_id
       where l.product_id = $1 order by p.observed_at asc`,
      [productId],
    );
    return result.rows.map(mapPrice);
  }

  async upsertOffer(input: NewOffer): Promise<Offer> {
    if (!input.providerOfferId) {
      const result = await this.pool.query<OfferRow>(
        `insert into shopping_offers
          (id, retailer_listing_id, provider_offer_id, offer_type, headline, current_price, reference_price,
           discount_percent, starts_at, ends_at, membership_required, terms_text, observed_at, status, provenance)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
        [
          randomUUID(), input.retailerListingId, null, input.offerType, input.headline, input.currentPrice,
          input.referencePrice ?? null, input.discountPercent ?? null, input.startsAt ?? null, input.endsAt ?? null,
          input.membershipRequired, input.termsText ?? null, input.observedAt, input.status,
          JSON.stringify(input.provenance),
        ],
      );
      return mapOffer(result.rows[0]!);
    }
    const result = await this.pool.query<OfferRow>(
      `insert into shopping_offers
        (id, retailer_listing_id, provider_offer_id, offer_type, headline, current_price, reference_price,
         discount_percent, starts_at, ends_at, membership_required, terms_text, observed_at, status, provenance)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (retailer_listing_id, provider_offer_id) where provider_offer_id is not null do update set
         offer_type = excluded.offer_type,
         headline = excluded.headline,
         current_price = excluded.current_price,
         reference_price = excluded.reference_price,
         discount_percent = excluded.discount_percent,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         membership_required = excluded.membership_required,
         terms_text = excluded.terms_text,
         observed_at = excluded.observed_at,
         status = excluded.status,
         provenance = excluded.provenance,
         updated_at = now()
       returning *`,
      [
        randomUUID(), input.retailerListingId, input.providerOfferId, input.offerType, input.headline,
        input.currentPrice, input.referencePrice ?? null, input.discountPercent ?? null, input.startsAt ?? null,
        input.endsAt ?? null, input.membershipRequired, input.termsText ?? null, input.observedAt,
        input.status, JSON.stringify(input.provenance),
      ],
    );
    return mapOffer(result.rows[0]!);
  }

  async listOffers(limit: number): Promise<readonly Offer[]> {
    const result = await this.pool.query<OfferRow>(
      `select * from shopping_offers
       order by coalesce(ends_at, '9999-12-31'::timestamptz), observed_at desc limit $1`,
      [limit],
    );
    return result.rows.map(mapOffer);
  }

  async createBasket(input: NewBasket): Promise<Basket> {
    const result = await this.pool.query<BasketRow>(
      `insert into shopping_baskets
        (id, household_id, status, currency, created_by_person_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [
        randomUUID(), input.householdId, input.status, input.currency, input.createdByPersonId,
        input.createdAt, input.updatedAt,
      ],
    );
    return mapBasket(result.rows[0]!);
  }

  async getBasket(id: string): Promise<Basket | null> {
    const result = await this.pool.query<BasketRow>('select * from shopping_baskets where id = $1', [id]);
    return result.rows[0] ? mapBasket(result.rows[0]) : null;
  }

  async addBasketItem(input: NewBasketItem): Promise<BasketItem> {
    const result = await this.pool.query<BasketItemRow>(
      `insert into shopping_basket_items
        (id, basket_id, product_id, preferred_listing_id, quantity, substitution_policy, selected_retailer_id)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [
        randomUUID(), input.basketId, input.productId, input.preferredListingId ?? null,
        input.quantity, input.substitutionPolicy, input.selectedRetailerId ?? null,
      ],
    );
    return mapBasketItem(result.rows[0]!);
  }

  async removeBasketItem(basketId: string, itemId: string): Promise<void> {
    await this.pool.query('delete from shopping_basket_items where basket_id = $1 and id = $2', [basketId, itemId]);
  }

  async listBasketItems(basketId: string): Promise<readonly BasketItem[]> {
    const result = await this.pool.query<BasketItemRow>(
      'select * from shopping_basket_items where basket_id = $1 order by id',
      [basketId],
    );
    return result.rows.map(mapBasketItem);
  }

  async saveBasketQuote(input: NewBasketQuote): Promise<BasketQuote> {
    const result = await this.pool.query<QuoteRow>(
      `insert into shopping_basket_quotes
        (id, basket_id, strategy, retailer_segments, unresolved_item_ids, items_subtotal, fees_estimate,
         total_estimate, baseline_total, estimated_saving, quoted_at, expires_at, freshness)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [
        randomUUID(), input.basketId, input.strategy, JSON.stringify(input.retailerSegments),
        JSON.stringify(input.unresolvedItemIds), input.itemsSubtotal, input.feesEstimate ?? null,
        input.totalEstimate, input.baselineTotal ?? null, input.estimatedSaving ?? null, input.quotedAt,
        input.expiresAt, input.freshness,
      ],
    );
    return mapQuote(result.rows[0]!);
  }

  async getBasketQuote(id: string): Promise<BasketQuote | null> {
    const result = await this.pool.query<QuoteRow>('select * from shopping_basket_quotes where id = $1', [id]);
    return result.rows[0] ? mapQuote(result.rows[0]) : null;
  }

  async saveCheckoutSession(input: NewCheckoutSession): Promise<CheckoutSession> {
    const id = randomUUID();
    await this.pool.query(
      `insert into shopping_checkout_sessions
        (id, basket_id, basket_quote_id, retailer_id, mode, status, handoff_url, provider_reference,
         validated_at, expires_at, created_by_person_id, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id, input.basketId, input.basketQuoteId, input.retailerId, input.mode, input.status,
        input.handoffUrl ?? null, input.providerReference ?? null, input.validatedAt ?? null,
        input.expiresAt ?? null, input.createdByPersonId, input.createdAt,
      ],
    );
    return { id, ...input };
  }

  async saveProductMatch(input: NewProductMatch): Promise<ProductMatch> {
    const id = randomUUID();
    await this.pool.query(
      `insert into shopping_product_matches
        (id, product_id, retailer_listing_id, method, confidence, exact, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (product_id, retailer_listing_id) do update set
         method = excluded.method, confidence = excluded.confidence, exact = excluded.exact`,
      [id, input.productId, input.retailerListingId, input.method, input.confidence, input.exact, input.createdAt],
    );
    return { id, ...input };
  }

  async recordImportFailure(input: NewImportFailure): Promise<ImportFailure> {
    const id = randomUUID();
    await this.pool.query(
      `insert into shopping_import_failures
        (id, connector_id, reason, record_kind, external_id, captured_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [id, input.connectorId, input.reason, input.recordKind ?? null, input.externalId ?? null, input.capturedAt],
    );
    return { id, ...input };
  }
}
