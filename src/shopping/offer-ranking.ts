import type { Clock } from '../kernel/clock.js';
import type { Freshness, Offer } from './shopping-types.js';

export type OfferReasonCode =
  | 'best_price'
  | 'large_saving'
  | 'expires_soon'
  | 'on_household_list'
  | 'frequently_bought'
  | 'better_unit_price';

export interface OfferRankingContext {
  readonly offer: Offer;
  readonly unitPriceAdvantagePercent?: number;
  readonly onHouseholdList?: boolean;
  readonly frequentlyBought?: boolean;
  readonly exactMatchConfidence?: number;
}

export interface RankedOffer extends OfferRankingContext {
  readonly score: number;
  readonly freshness: Freshness;
  readonly euroSaving?: number;
  readonly reasonCodes: readonly OfferReasonCode[];
}

export function classifyOfferFreshness(offer: Offer, now: Date): Freshness {
  if (offer.endsAt && offer.endsAt.getTime() < now.getTime()) return 'stale';
  const ageMs = now.getTime() - offer.observedAt.getTime();
  if (ageMs < 0) return 'unknown';
  return ageMs <= 48 * 60 * 60 * 1000 ? 'live_or_recent' : 'stale';
}

export function rankOffers(
  contexts: readonly OfferRankingContext[],
  clock: Clock,
): readonly RankedOffer[] {
  const now = clock.now();
  return contexts
    .map((context): RankedOffer => {
      const { offer } = context;
      const freshness = classifyOfferFreshness(offer, now);
      const euroSaving =
        offer.referencePrice !== undefined && offer.referencePrice > offer.currentPrice
          ? Math.round((offer.referencePrice - offer.currentPrice) * 100) / 100
          : undefined;
      const reasonCodes: OfferReasonCode[] = [];
      let score = freshness === 'live_or_recent' ? 20 : -40;

      if (euroSaving !== undefined) {
        score += Math.min(35, euroSaving * 6);
        if (euroSaving >= 2) reasonCodes.push('large_saving');
      }
      if (offer.discountPercent !== undefined && offer.referencePrice !== undefined) {
        score += Math.min(25, offer.discountPercent * 0.55);
      }
      if (context.unitPriceAdvantagePercent !== undefined && context.unitPriceAdvantagePercent > 0) {
        score += Math.min(18, context.unitPriceAdvantagePercent * 0.5);
        reasonCodes.push('better_unit_price');
      }
      if (context.onHouseholdList) {
        score += 24;
        reasonCodes.push('on_household_list');
      }
      if (context.frequentlyBought) {
        score += 10;
        reasonCodes.push('frequently_bought');
      }
      if (offer.endsAt) {
        const hours = (offer.endsAt.getTime() - now.getTime()) / 3_600_000;
        if (hours >= 0 && hours <= 48) {
          score += 12;
          reasonCodes.push('expires_soon');
        }
      }
      if ((context.exactMatchConfidence ?? 1) < 0.9) score -= 15;
      if (reasonCodes.length === 0 && freshness === 'live_or_recent') reasonCodes.push('best_price');

      return {
        ...context,
        score: Math.round(score * 100) / 100,
        freshness,
        ...(euroSaving !== undefined ? { euroSaving } : {}),
        reasonCodes,
      };
    })
    .filter((item) => item.offer.status !== 'expired')
    .sort((a, b) => b.score - a.score || a.offer.currentPrice - b.offer.currentPrice);
}
