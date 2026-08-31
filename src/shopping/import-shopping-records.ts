import type { Clock } from '../kernel/clock.js';
import { shoppingRecordSchema } from './shopping-schemas.js';
import type { ShoppingRepository } from './shopping-repository.js';
import type { OfferStatus, RetailerSlug } from './shopping-types.js';
import { normalizePackageSize } from './unit-normalization.js';

export interface ShoppingImportSummary {
  readonly accepted: number;
  readonly rejected: number;
  readonly listings: number;
  readonly prices: number;
  readonly offers: number;
}

function retailerDefinition(slug: RetailerSlug) {
  if (slug === 'alphamega-cy') {
    return {
      slug,
      displayName: 'AlphaMega',
      countryCode: 'CY' as const,
      supportsCatalogue: true,
      supportsOffers: true,
      supportsBasketRevalidation: false,
      supportsCheckoutHandoff: true,
      supportsDirectCheckout: false,
      status: 'active' as const,
    };
  }
  if (slug === 'lidl-cy') {
    return {
      slug,
      displayName: 'Lidl Cyprus',
      countryCode: 'CY' as const,
      supportsCatalogue: false,
      supportsOffers: true,
      supportsBasketRevalidation: false,
      supportsCheckoutHandoff: false,
      supportsDirectCheckout: false,
      status: 'active' as const,
    };
  }
  return {
    slug,
    displayName: 'e-Kalathi',
    countryCode: 'CY' as const,
    supportsCatalogue: true,
    supportsOffers: false,
    supportsBasketRevalidation: false,
    supportsCheckoutHandoff: false,
    supportsDirectCheckout: false,
    status: 'active' as const,
  };
}

function offerStatus(now: Date, startsAt?: Date, endsAt?: Date): OfferStatus {
  if (startsAt && startsAt.getTime() > now.getTime()) return 'upcoming';
  if (endsAt && endsAt.getTime() < now.getTime()) return 'expired';
  return 'current';
}

function unknownRecordInfo(value: unknown): { recordKind?: string; externalId?: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.kind === 'string' ? { recordKind: record.kind } : {}),
    ...(typeof record.externalId === 'string' ? { externalId: record.externalId } : {}),
  };
}

export class ImportShoppingRecords {
  constructor(
    private readonly repository: ShoppingRepository,
    private readonly clock: Clock,
  ) {}

  async execute(connectorId: string, rawRecords: readonly unknown[]): Promise<ShoppingImportSummary> {
    let accepted = 0;
    let rejected = 0;
    let listings = 0;
    let prices = 0;
    let offers = 0;

    for (const rawRecord of rawRecords) {
      const parsed = shoppingRecordSchema.safeParse(rawRecord);
      if (!parsed.success) {
        rejected += 1;
        const info = unknownRecordInfo(rawRecord);
        await this.repository.recordImportFailure({
          connectorId,
          reason: parsed.error.issues.map((issue) => issue.message).join('; '),
          capturedAt: this.clock.now(),
          ...info,
        });
        continue;
      }

      const record = parsed.data;
      try {
        const retailer = await this.repository.upsertRetailer(retailerDefinition(record.retailerSlug));
        if (record.kind === 'listing') {
          let product = record.gtin ? await this.repository.findProductByGtin(record.gtin) : null;
          if (!product) {
            const normalizedPackage = record.packageText ? normalizePackageSize(record.packageText) : null;
            product = await this.repository.createProduct({
              canonicalName: record.title,
              category: record.category,
              status: 'active',
              ...(record.brand ? { brand: record.brand } : {}),
              ...(record.gtin ? { gtin: record.gtin } : {}),
              ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
              ...(normalizedPackage
                ? { sizeValue: normalizedPackage.value, sizeUnit: normalizedPackage.unit }
                : {}),
            });
          }
          await this.repository.upsertListing({
            productId: product.id,
            retailerId: retailer.id,
            externalId: record.externalId,
            sourceName: connectorId,
            title: record.title,
            availability: record.availability,
            lastObservedAt: new Date(record.observedAt),
            ...(record.externalUrl ? { externalUrl: record.externalUrl } : {}),
            ...(record.brand ? { brand: record.brand } : {}),
            ...(record.packageText ? { packageText: record.packageText } : {}),
            ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
            ...(record.gtin ? { gtin: record.gtin } : {}),
          });
          listings += 1;
        } else if (record.kind === 'price') {
          const listing = await this.repository.findListing(record.retailerSlug, record.externalId);
          if (!listing) throw new Error('price record arrived before its retailer listing');
          await this.repository.appendPriceObservation({
            retailerListingId: listing.id,
            price: record.price,
            currency: record.currency,
            observedAt: new Date(record.observedAt),
            provenance: {
              sourceUrl: record.provenance.sourceUrl,
              acquisition: record.provenance.acquisition,
              ...(record.provenance.sourceUpdatedAt
                ? { sourceUpdatedAt: new Date(record.provenance.sourceUpdatedAt) }
                : {}),
            },
            ...(record.referencePrice !== undefined ? { referencePrice: record.referencePrice } : {}),
            ...(record.unitPrice !== undefined ? { unitPrice: record.unitPrice } : {}),
            ...(record.unitBasis ? { unitBasis: record.unitBasis } : {}),
            ...(record.promotionId ? { promotionId: record.promotionId } : {}),
            ...(record.sourceUpdatedAt ? { sourceUpdatedAt: new Date(record.sourceUpdatedAt) } : {}),
          });
          prices += 1;
        } else {
          const listing = await this.repository.findListing(record.retailerSlug, record.externalId);
          if (!listing) throw new Error('offer record arrived before its retailer listing');
          const startsAt = record.startsAt ? new Date(record.startsAt) : undefined;
          const endsAt = record.endsAt ? new Date(record.endsAt) : undefined;
          await this.repository.upsertOffer({
            retailerListingId: listing.id,
            offerType: record.offerType,
            headline: record.headline,
            currentPrice: record.currentPrice,
            membershipRequired: record.membershipRequired,
            observedAt: new Date(record.observedAt),
            status: offerStatus(this.clock.now(), startsAt, endsAt),
            provenance: {
              sourceUrl: record.provenance.sourceUrl,
              acquisition: record.provenance.acquisition,
              ...(record.provenance.sourceUpdatedAt
                ? { sourceUpdatedAt: new Date(record.provenance.sourceUpdatedAt) }
                : {}),
            },
            ...(record.providerOfferId ? { providerOfferId: record.providerOfferId } : {}),
            ...(record.referencePrice !== undefined ? { referencePrice: record.referencePrice } : {}),
            ...(record.discountPercent !== undefined ? { discountPercent: record.discountPercent } : {}),
            ...(startsAt ? { startsAt } : {}),
            ...(endsAt ? { endsAt } : {}),
            ...(record.termsText ? { termsText: record.termsText } : {}),
          });
          offers += 1;
        }
        accepted += 1;
      } catch (error) {
        rejected += 1;
        await this.repository.recordImportFailure({
          connectorId,
          reason: error instanceof Error ? error.message : 'unknown shopping import failure',
          recordKind: record.kind,
          externalId: record.externalId,
          capturedAt: this.clock.now(),
        });
      }
    }

    return { accepted, rejected, listings, prices, offers };
  }
}
