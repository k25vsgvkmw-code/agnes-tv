import type {
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  ConnectorSyncResult,
} from '../connector.js';
import { calculateUnitPrice } from '../../shopping/unit-normalization.js';
import { parsePublicProducts } from './public-product-parser.js';
import type { ShoppingAction, ShoppingRecord } from './shopping-records.js';
import type { SourceFetcher } from './source-fetcher.js';

export interface PublicShoppingConnectorConfig {
  readonly id: string;
  readonly retailerSlug: 'alphamega-cy' | 'lidl-cy' | 'e-kalathi-cy';
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly supportsHandoff: boolean;
  readonly handoffUrl?: string;
}

export class PublicShoppingConnector implements Connector<ShoppingRecord, ShoppingAction> {
  readonly id: string;
  private connected = false;
  private lastHealth: ConnectorHealth = { state: 'disconnected', checkedAt: new Date(0) };

  constructor(
    private readonly config: PublicShoppingConnectorConfig,
    private readonly fetcher: SourceFetcher,
  ) {
    this.id = config.id;
  }

  connect(): Promise<void> {
    this.connected = true;
    this.lastHealth = { state: 'connected', checkedAt: new Date() };
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    this.lastHealth = { state: 'disconnected', checkedAt: new Date() };
    return Promise.resolve();
  }

  health(): Promise<ConnectorHealth> {
    return Promise.resolve(this.lastHealth);
  }

  capabilities(): ConnectorCapabilities {
    return {
      read: true,
      write: this.config.supportsHandoff,
      incrementalSync: false,
      push: false,
    };
  }

  async sync(): Promise<ConnectorSyncResult<ShoppingRecord>> {
    if (!this.connected) throw new Error(`connector ${this.id} is disconnected`);
    try {
      const source = await this.fetcher.fetchText(this.config.sourceUrl);
      const products = parsePublicProducts(source.body);
      if (products.length === 0) {
        this.lastHealth = {
          state: 'degraded',
          checkedAt: new Date(),
          message: 'source was reachable but no supported product records were found',
        };
        return { records: [] };
      }
      const observedAt = source.fetchedAt.toISOString();
      const records: ShoppingRecord[] = [];
      for (const product of products) {
        const provenance = { sourceUrl: source.url, acquisition: 'public_web' as const };
        records.push({
          kind: 'listing',
          retailerSlug: this.config.retailerSlug,
          externalId: product.externalId,
          title: product.title,
          category: product.category ?? 'other',
          availability: 'available',
          observedAt,
          provenance,
          ...(product.brand ? { brand: product.brand } : {}),
          ...(product.packageText ? { packageText: product.packageText } : {}),
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
          ...(product.externalUrl ? { externalUrl: product.externalUrl } : {}),
          ...(product.gtin ? { gtin: product.gtin } : {}),
        });
        if (product.price !== undefined) {
          const unit = product.packageText ? calculateUnitPrice(product.price, product.packageText) : null;
          records.push({
            kind: 'price',
            retailerSlug: this.config.retailerSlug,
            externalId: product.externalId,
            price: product.price,
            currency: 'EUR',
            observedAt,
            provenance,
            ...(product.referencePrice !== undefined ? { referencePrice: product.referencePrice } : {}),
            ...(unit ? { unitPrice: unit.unitPrice, unitBasis: unit.unitBasis } : {}),
            ...(product.providerOfferId ? { promotionId: product.providerOfferId } : {}),
          });
        }
        if (
          product.price !== undefined &&
          (product.providerOfferId || product.offerHeadline ||
            (product.referencePrice !== undefined && product.referencePrice > product.price))
        ) {
          const discountPercent =
            product.referencePrice !== undefined && product.referencePrice > 0
              ? Math.round(((product.referencePrice - product.price) / product.referencePrice) * 1000) / 10
              : undefined;
          records.push({
            kind: 'offer',
            retailerSlug: this.config.retailerSlug,
            externalId: product.externalId,
            headline: product.offerHeadline ?? product.title,
            currentPrice: product.price,
            offerType: product.membershipRequired ? 'member_price' : 'price_cut',
            membershipRequired: product.membershipRequired ?? false,
            observedAt,
            provenance,
            ...(product.providerOfferId ? { providerOfferId: product.providerOfferId } : {}),
            ...(product.referencePrice !== undefined ? { referencePrice: product.referencePrice } : {}),
            ...(discountPercent !== undefined ? { discountPercent } : {}),
            ...(product.startsAt ? { startsAt: product.startsAt } : {}),
            ...(product.endsAt ? { endsAt: product.endsAt } : {}),
          });
        }
      }
      this.lastHealth = { state: 'connected', checkedAt: new Date() };
      return { records };
    } catch (error) {
      this.lastHealth = {
        state: 'degraded',
        checkedAt: new Date(),
        message: error instanceof Error ? error.message : 'shopping source sync failed',
      };
      throw error;
    }
  }

  execute(action: ShoppingAction): Promise<unknown> {
    if (!this.config.supportsHandoff || !this.config.handoffUrl) {
      return Promise.reject(new Error(`connector ${this.id} does not support checkout handoff`));
    }
    if (action.kind === 'revalidate_basket') {
      return Promise.resolve({ supported: false, items: action.items });
    }
    return Promise.resolve({
      mode: 'retailer_handoff' as const,
      url: this.config.handoffUrl,
      preparedItemCount: 0,
    });
  }
}
