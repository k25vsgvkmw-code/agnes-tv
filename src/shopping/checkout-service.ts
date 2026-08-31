import type { Connector } from '../integrations/connector.js';
import type {
  CheckoutHandoffResult,
  ShoppingAction,
  ShoppingRecord,
} from '../integrations/shopping/shopping-records.js';
import type { Clock } from '../kernel/clock.js';
import type { ShoppingRepository } from './shopping-repository.js';
import type { CheckoutSession, RetailerSlug } from './shopping-types.js';

export interface PrepareCheckoutResult {
  readonly sessions: readonly CheckoutSession[];
  readonly estimatedTotal: number;
  readonly estimatedSaving?: number;
}

function isHandoffResult(value: unknown): value is CheckoutHandoffResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.mode === 'retailer_handoff' || record.mode === 'prefilled_handoff') &&
    typeof record.url === 'string' &&
    typeof record.preparedItemCount === 'number'
  );
}

function isRevalidationSupported(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return (value as Record<string, unknown>).supported === true;
}

export class CheckoutService {
  constructor(
    private readonly repository: ShoppingRepository,
    private readonly connectors: ReadonlyMap<RetailerSlug, Connector<ShoppingRecord, ShoppingAction>>,
    private readonly clock: Clock,
  ) {}

  async prepareCheckout(quoteId: string, createdByPersonId: string): Promise<PrepareCheckoutResult> {
    const quote = await this.repository.getBasketQuote(quoteId);
    if (!quote) throw new Error('basket quote not found');
    const now = this.clock.now();
    if (quote.expiresAt.getTime() <= now.getTime()) throw new Error('basket quote has expired');
    if (quote.unresolvedItemIds.length > 0) throw new Error('basket quote contains unresolved items');

    const sessions: CheckoutSession[] = [];
    for (const segment of quote.retailerSegments) {
      const retailer = await this.repository.getRetailer(segment.retailerId);
      if (!retailer) throw new Error('retailer not found for basket segment');
      if (!retailer.supportsCheckoutHandoff) {
        throw new Error(`${retailer.displayName} does not support online checkout handoff`);
      }
      const connector = this.connectors.get(retailer.slug);
      if (!connector || !connector.capabilities().write || !connector.execute) {
        throw new Error(`checkout connector unavailable for ${retailer.displayName}`);
      }
      const items = segment.items.map((item) => ({
        externalId: item.retailerListingId,
        quantity: item.quantity,
      }));
      const revalidation = await connector.execute({ kind: 'revalidate_basket', items });
      const validatedAt = isRevalidationSupported(revalidation) ? this.clock.now() : undefined;
      const handoff = await connector.execute({ kind: 'prepare_checkout_handoff', items });
      if (!isHandoffResult(handoff)) throw new Error('retailer did not return a valid checkout handoff');

      sessions.push(
        await this.repository.saveCheckoutSession({
          basketId: quote.basketId,
          basketQuoteId: quote.id,
          retailerId: segment.retailerId,
          mode: handoff.mode,
          status: 'prepared',
          handoffUrl: handoff.url,
          createdByPersonId,
          createdAt: this.clock.now(),
          expiresAt: new Date(this.clock.now().getTime() + 30 * 60 * 1000),
          ...(validatedAt ? { validatedAt } : {}),
        }),
      );
    }

    return {
      sessions,
      estimatedTotal: quote.totalEstimate,
      ...(quote.estimatedSaving !== undefined ? { estimatedSaving: quote.estimatedSaving } : {}),
    };
  }
}
