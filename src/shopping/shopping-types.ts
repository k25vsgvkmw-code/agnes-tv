export type RetailerSlug = 'alphamega-cy' | 'lidl-cy' | 'e-kalathi-cy';
export type CurrencyCode = 'EUR';
export type Freshness = 'live_or_recent' | 'stale' | 'unknown';
export type ListingAvailability = 'available' | 'unavailable' | 'unknown';
export type MatchMethod =
  | 'gtin'
  | 'provider_mapping'
  | 'normalized_identity'
  | 'fuzzy_alternative';
export type SubstitutionPolicy = 'exact_only' | 'allow_equivalent' | 'allow_any';
export type BasketStrategy = 'single_retailer' | 'split_retailer';
export type CheckoutMode =
  | 'direct_provider_api'
  | 'prefilled_handoff'
  | 'retailer_handoff';
export type CheckoutStatus =
  | 'prepared'
  | 'handoff_started'
  | 'provider_confirmed'
  | 'expired'
  | 'cancelled';
export type EntityStatus = 'active' | 'inactive';
export type OfferStatus = 'current' | 'upcoming' | 'expired' | 'stale';
export type OfferType = 'price_cut' | 'multibuy' | 'member_price' | 'other';

export interface Provenance {
  readonly sourceUrl: string;
  readonly acquisition: 'public_web' | 'official_api' | 'official_feed';
  readonly sourceUpdatedAt?: Date;
}

export interface Retailer {
  readonly id: string;
  readonly slug: RetailerSlug;
  readonly displayName: string;
  readonly countryCode: 'CY';
  readonly supportsCatalogue: boolean;
  readonly supportsOffers: boolean;
  readonly supportsBasketRevalidation: boolean;
  readonly supportsCheckoutHandoff: boolean;
  readonly supportsDirectCheckout: boolean;
  readonly status: EntityStatus;
}

export interface Product {
  readonly id: string;
  readonly canonicalName: string;
  readonly brand?: string;
  readonly category: string;
  readonly subCategory?: string;
  readonly gtin?: string;
  readonly sizeValue?: number;
  readonly sizeUnit?: string;
  readonly imageUrl?: string;
  readonly status: EntityStatus;
}

export interface RetailerListing {
  readonly id: string;
  readonly productId: string;
  readonly retailerId: string;
  readonly externalId: string;
  readonly externalUrl?: string;
  readonly sourceName: string;
  readonly title: string;
  readonly brand?: string;
  readonly packageText?: string;
  readonly imageUrl?: string;
  readonly gtin?: string;
  readonly availability: ListingAvailability;
  readonly lastObservedAt: Date;
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

export interface Offer {
  readonly id: string;
  readonly retailerListingId: string;
  readonly providerOfferId?: string;
  readonly offerType: OfferType;
  readonly headline: string;
  readonly currentPrice: number;
  readonly referencePrice?: number;
  readonly discountPercent?: number;
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly membershipRequired: boolean;
  readonly termsText?: string;
  readonly observedAt: Date;
  readonly status: OfferStatus;
  readonly provenance: Provenance;
}

export interface ShoppingList {
  readonly id: string;
  readonly householdId: string;
  readonly name: string;
  readonly status: EntityStatus;
  readonly createdByPersonId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ShoppingListItem {
  readonly id: string;
  readonly shoppingListId: string;
  readonly requestedText: string;
  readonly productId?: string;
  readonly quantity: number;
  readonly preferredBrand?: string;
  readonly substitutionPolicy: SubstitutionPolicy;
  readonly status: EntityStatus;
}

export interface Basket {
  readonly id: string;
  readonly householdId: string;
  readonly status: 'open' | 'quoted' | 'checkout' | 'closed';
  readonly currency: CurrencyCode;
  readonly createdByPersonId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BasketItem {
  readonly id: string;
  readonly basketId: string;
  readonly productId: string;
  readonly preferredListingId?: string;
  readonly quantity: number;
  readonly substitutionPolicy: SubstitutionPolicy;
  readonly selectedRetailerId?: string;
}

export interface BasketSegmentItem {
  readonly basketItemId: string;
  readonly productId: string;
  readonly retailerListingId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
}

export interface BasketRetailerSegment {
  readonly retailerId: string;
  readonly retailerSlug: RetailerSlug;
  readonly items: readonly BasketSegmentItem[];
  readonly subtotal: number;
  readonly feeEstimate?: number;
  readonly total: number;
}

export interface BasketQuote {
  readonly id: string;
  readonly basketId: string;
  readonly strategy: BasketStrategy;
  readonly retailerSegments: readonly BasketRetailerSegment[];
  readonly unresolvedItemIds: readonly string[];
  readonly itemsSubtotal: number;
  readonly feesEstimate?: number;
  readonly totalEstimate: number;
  readonly baselineTotal?: number;
  readonly estimatedSaving?: number;
  readonly quotedAt: Date;
  readonly expiresAt: Date;
  readonly freshness: Freshness;
}

export interface CheckoutSession {
  readonly id: string;
  readonly basketId: string;
  readonly basketQuoteId: string;
  readonly retailerId: string;
  readonly mode: CheckoutMode;
  readonly status: CheckoutStatus;
  readonly handoffUrl?: string;
  readonly providerReference?: string;
  readonly validatedAt?: Date;
  readonly expiresAt?: Date;
  readonly createdByPersonId: string;
  readonly createdAt: Date;
}

export interface ProductMatch {
  readonly id: string;
  readonly productId: string;
  readonly retailerListingId: string;
  readonly method: MatchMethod;
  readonly confidence: number;
  readonly exact: boolean;
  readonly createdAt: Date;
}

export interface ImportFailure {
  readonly id: string;
  readonly connectorId: string;
  readonly reason: string;
  readonly recordKind?: string;
  readonly externalId?: string;
  readonly capturedAt: Date;
}
