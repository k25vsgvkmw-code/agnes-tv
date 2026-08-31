import { z } from 'zod';

export const retailerSlugSchema = z.enum(['alphamega-cy', 'lidl-cy', 'e-kalathi-cy']);

export const provenanceRecordSchema = z.object({
  sourceUrl: z.string().url(),
  acquisition: z.enum(['public_web', 'official_api', 'official_feed']),
  sourceUpdatedAt: z.string().datetime().optional(),
});

export const listingRecordSchema = z.object({
  kind: z.literal('listing'),
  retailerSlug: retailerSlugSchema,
  externalId: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().min(1).optional(),
  packageText: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
  gtin: z.string().min(8).optional(),
  category: z.string().min(1).default('other'),
  availability: z.enum(['available', 'unavailable', 'unknown']).default('unknown'),
  observedAt: z.string().datetime(),
  provenance: provenanceRecordSchema,
});

export const priceObservationRecordSchema = z.object({
  kind: z.literal('price'),
  retailerSlug: retailerSlugSchema,
  externalId: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.literal('EUR'),
  referencePrice: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  unitBasis: z.string().min(1).optional(),
  promotionId: z.string().min(1).optional(),
  observedAt: z.string().datetime(),
  sourceUpdatedAt: z.string().datetime().optional(),
  provenance: provenanceRecordSchema,
});

export const offerRecordSchema = z.object({
  kind: z.literal('offer'),
  retailerSlug: retailerSlugSchema,
  externalId: z.string().min(1),
  providerOfferId: z.string().min(1).optional(),
  offerType: z.enum(['price_cut', 'multibuy', 'member_price', 'other']).default('price_cut'),
  headline: z.string().min(1),
  currentPrice: z.number().nonnegative(),
  referencePrice: z.number().positive().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  membershipRequired: z.boolean().default(false),
  termsText: z.string().min(1).optional(),
  observedAt: z.string().datetime(),
  provenance: provenanceRecordSchema,
});

export const shoppingRecordSchema = z.discriminatedUnion('kind', [
  listingRecordSchema,
  priceObservationRecordSchema,
  offerRecordSchema,
]);

export type ListingRecordInput = z.infer<typeof listingRecordSchema>;
export type PriceObservationRecordInput = z.infer<typeof priceObservationRecordSchema>;
export type OfferRecordInput = z.infer<typeof offerRecordSchema>;
export type ShoppingRecordInput = z.infer<typeof shoppingRecordSchema>;
