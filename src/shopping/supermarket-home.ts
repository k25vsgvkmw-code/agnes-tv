import type { Clock } from '../kernel/clock.js';
import { rankOffers, type OfferReasonCode } from './offer-ranking.js';
import type { ShoppingRepository } from './shopping-repository.js';
import type { Freshness, RetailerSlug } from './shopping-types.js';

export type SeasonKey =
  | 'late_summer'
  | 'autumn'
  | 'christmas'
  | 'winter'
  | 'spring'
  | 'easter'
  | 'summer';

export interface SeasonalTheme {
  readonly seasonKey: SeasonKey;
  readonly accentFamily: string;
  readonly backgroundMood: string;
  readonly heroContext: string;
}

export interface SupermarketOfferCard {
  readonly offerId: string;
  readonly productId: string;
  readonly productName: string;
  readonly brand?: string;
  readonly imageUrl?: string;
  readonly retailerId: string;
  readonly retailerSlug: RetailerSlug;
  readonly retailerName: string;
  readonly currentPrice: number;
  readonly referencePrice?: number;
  readonly euroSaving?: number;
  readonly discountPercent?: number;
  readonly expiry?: Date;
  readonly freshness: Freshness;
  readonly reasonBadges: readonly OfferReasonCode[];
  readonly score: number;
}

export interface SupermarketHomeModel {
  readonly generatedAt: Date;
  readonly seasonalTheme: SeasonalTheme;
  readonly sectionOrder: readonly [
    'top_offers_now',
    'ending_soon',
    'your_list_is_cheaper_here',
    'best_basket_opportunity',
    'filters',
    'catalogue',
  ];
  readonly topOffersNow: readonly SupermarketOfferCard[];
  readonly endingSoon: readonly SupermarketOfferCard[];
}

export function seasonalThemeFor(date: Date): SeasonalTheme {
  const month = date.getUTCMonth() + 1;
  if (month === 12) {
    return {
      seasonKey: 'christmas',
      accentFamily: 'pine-red-gold',
      backgroundMood: 'warm festive market',
      heroContext: 'Christmas savings and family table',
    };
  }
  if (month === 1 || month === 2) {
    return {
      seasonKey: 'winter',
      accentFamily: 'ice-blue-warm-amber',
      backgroundMood: 'clear winter kitchen',
      heroContext: 'winter essentials and comfort food',
    };
  }
  if (month >= 3 && month <= 5) {
    return {
      seasonKey: 'spring',
      accentFamily: 'fresh-green-soft-yellow',
      backgroundMood: 'fresh spring market',
      heroContext: 'fresh produce and spring offers',
    };
  }
  if (month >= 6 && month <= 7) {
    return {
      seasonKey: 'summer',
      accentFamily: 'sea-blue-citrus-yellow',
      backgroundMood: 'bright Mediterranean summer',
      heroContext: 'cool drinks, fruit and summer essentials',
    };
  }
  if (month === 8) {
    return {
      seasonKey: 'late_summer',
      accentFamily: 'sunset-peach-olive-green',
      backgroundMood: 'late Mediterranean summer',
      heroContext: 'back-to-routine savings and fresh seasonal food',
    };
  }
  return {
    seasonKey: 'autumn',
    accentFamily: 'pumpkin-terracotta-olive',
    backgroundMood: 'warm autumn pantry',
    heroContext: 'weekly offers and family pantry savings',
  };
}

export class SupermarketHomeService {
  constructor(
    private readonly repository: ShoppingRepository,
    private readonly clock: Clock,
  ) {}

  async getHome(limit = 24): Promise<SupermarketHomeModel> {
    const offers = await this.repository.listOffers(Math.max(limit * 3, 50));
    const contexts = [];
    const cardContext = new Map<
      string,
      { productId: string; productName: string; brand?: string; imageUrl?: string; retailerId: string; retailerSlug: RetailerSlug; retailerName: string }
    >();

    for (const offer of offers) {
      const listing = await this.repository.getListingById(offer.retailerListingId);
      if (!listing) continue;
      const product = await this.repository.getProduct(listing.productId);
      const retailer = await this.repository.getRetailer(listing.retailerId);
      if (!product || !retailer) continue;
      contexts.push({ offer, exactMatchConfidence: 1 });
      cardContext.set(offer.id, {
        productId: product.id,
        productName: product.canonicalName,
        ...(product.brand ? { brand: product.brand } : {}),
        ...(listing.imageUrl || product.imageUrl ? { imageUrl: listing.imageUrl ?? product.imageUrl! } : {}),
        retailerId: retailer.id,
        retailerSlug: retailer.slug,
        retailerName: retailer.displayName,
      });
    }

    const ranked = rankOffers(contexts, this.clock);
    const cards: SupermarketOfferCard[] = [];
    for (const rankedOffer of ranked) {
      const context = cardContext.get(rankedOffer.offer.id);
      if (!context) continue;
      cards.push({
        offerId: rankedOffer.offer.id,
        ...context,
        currentPrice: rankedOffer.offer.currentPrice,
        freshness: rankedOffer.freshness,
        reasonBadges: rankedOffer.reasonCodes,
        score: rankedOffer.score,
        ...(rankedOffer.offer.referencePrice !== undefined
          ? { referencePrice: rankedOffer.offer.referencePrice }
          : {}),
        ...(rankedOffer.euroSaving !== undefined ? { euroSaving: rankedOffer.euroSaving } : {}),
        ...(rankedOffer.offer.discountPercent !== undefined
          ? { discountPercent: rankedOffer.offer.discountPercent }
          : {}),
        ...(rankedOffer.offer.endsAt ? { expiry: rankedOffer.offer.endsAt } : {}),
      });
      if (cards.length >= limit) break;
    }

    const now = this.clock.now();
    const endingSoon = cards
      .filter((card) => card.expiry && card.expiry.getTime() >= now.getTime())
      .sort((a, b) => a.expiry!.getTime() - b.expiry!.getTime())
      .slice(0, 8);

    return {
      generatedAt: now,
      seasonalTheme: seasonalThemeFor(now),
      sectionOrder: [
        'top_offers_now',
        'ending_soon',
        'your_list_is_cheaper_here',
        'best_basket_opportunity',
        'filters',
        'catalogue',
      ],
      topOffersNow: cards,
      endingSoon,
    };
  }
}
