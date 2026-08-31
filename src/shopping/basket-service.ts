import type { Clock } from '../kernel/clock.js';
import { optimizeBasket, type BasketOptimizerPolicy, type PricedBasketItem } from './basket-optimizer.js';
import type { ShoppingRepository } from './shopping-repository.js';
import type { Basket, BasketItem, BasketQuote, SubstitutionPolicy } from './shopping-types.js';

export interface CreateBasketInput {
  readonly householdId: string;
  readonly createdByPersonId: string;
}

export interface AddBasketItemInput {
  readonly productId: string;
  readonly quantity: number;
  readonly substitutionPolicy?: SubstitutionPolicy;
  readonly preferredListingId?: string;
}

export class BasketService {
  constructor(
    private readonly repository: ShoppingRepository,
    private readonly clock: Clock,
  ) {}

  createBasket(input: CreateBasketInput): Promise<Basket> {
    const now = this.clock.now();
    return this.repository.createBasket({
      householdId: input.householdId,
      status: 'open',
      currency: 'EUR',
      createdByPersonId: input.createdByPersonId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async addItem(basketId: string, input: AddBasketItemInput): Promise<BasketItem> {
    if (input.quantity <= 0) throw new Error('basket item quantity must be greater than zero');
    const basket = await this.repository.getBasket(basketId);
    if (!basket) throw new Error('basket not found');
    if (basket.status !== 'open' && basket.status !== 'quoted') throw new Error('basket is not editable');
    const product = await this.repository.getProduct(input.productId);
    if (!product) throw new Error('product not found');
    return this.repository.addBasketItem({
      basketId,
      productId: input.productId,
      quantity: input.quantity,
      substitutionPolicy: input.substitutionPolicy ?? 'exact_only',
      ...(input.preferredListingId ? { preferredListingId: input.preferredListingId } : {}),
    });
  }

  removeItem(basketId: string, itemId: string): Promise<void> {
    return this.repository.removeBasketItem(basketId, itemId);
  }

  async quoteBasket(basketId: string, policy?: BasketOptimizerPolicy): Promise<BasketQuote> {
    const basket = await this.repository.getBasket(basketId);
    if (!basket) throw new Error('basket not found');
    const items = await this.repository.listBasketItems(basketId);
    if (items.length === 0) throw new Error('cannot quote an empty basket');

    let stale = false;
    const now = this.clock.now();
    const pricedItems: PricedBasketItem[] = [];
    for (const item of items) {
      const listings = await this.repository.listListingsForProduct(item.productId);
      const options: PricedBasketItem['options'][number][] = [];
      for (const listing of listings) {
        if (listing.availability === 'unavailable') continue;
        if (item.preferredListingId && item.substitutionPolicy === 'exact_only' && listing.id !== item.preferredListingId) {
          continue;
        }
        const retailer = await this.repository.getRetailer(listing.retailerId);
        if (!retailer || retailer.slug === 'e-kalathi-cy') continue;
        const price = await this.repository.latestPriceForListing(listing.id);
        if (!price) continue;
        if (now.getTime() - price.observedAt.getTime() > 48 * 60 * 60 * 1000) stale = true;
        options.push({
          retailerId: retailer.id,
          retailerSlug: retailer.slug,
          retailerListingId: listing.id,
          unitPrice: price.price,
        });
      }
      pricedItems.push({
        basketItemId: item.id,
        productId: item.productId,
        quantity: item.quantity,
        options,
      });
    }

    const optimized = optimizeBasket(pricedItems, policy);
    const quotedAt = this.clock.now();
    return this.repository.saveBasketQuote({
      basketId,
      strategy: optimized.strategy,
      retailerSegments: optimized.retailerSegments,
      unresolvedItemIds: optimized.unresolvedItemIds,
      itemsSubtotal: optimized.itemsSubtotal,
      feesEstimate: optimized.feesEstimate,
      totalEstimate: optimized.totalEstimate,
      quotedAt,
      expiresAt: new Date(quotedAt.getTime() + 15 * 60 * 1000),
      freshness: stale ? 'stale' : 'live_or_recent',
      ...(optimized.baselineTotal !== undefined ? { baselineTotal: optimized.baselineTotal } : {}),
      ...(optimized.estimatedSaving !== undefined ? { estimatedSaving: optimized.estimatedSaving } : {}),
    });
  }
}
