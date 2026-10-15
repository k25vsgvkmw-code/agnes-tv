import type { z } from 'zod';
import type { shoppingRecordSchema } from '../../shopping/shopping-schemas.js';

export type ShoppingRecord = z.output<typeof shoppingRecordSchema>;

export interface RevalidationItem {
  readonly externalId: string;
  readonly quantity: number;
  readonly quotedUnitPrice: number;
}

export interface RevalidatedItem {
  readonly externalId: string;
  readonly availability: 'available' | 'unavailable' | 'unknown';
  readonly unitPrice?: number;
}

export interface BasketRevalidationResult {
  readonly supported: boolean;
  readonly items?: readonly RevalidatedItem[];
}

export interface RevalidateBasketAction {
  readonly kind: 'revalidate_basket';
  readonly items: readonly RevalidationItem[];
}

export interface HandoffItem {
  readonly externalId: string;
  readonly quantity: number;
}

export interface PrepareCheckoutHandoffAction {
  readonly kind: 'prepare_checkout_handoff';
  readonly items: readonly HandoffItem[];
}

export type ShoppingAction = RevalidateBasketAction | PrepareCheckoutHandoffAction;

export interface CheckoutHandoffResult {
  readonly mode: 'retailer_handoff' | 'prefilled_handoff';
  readonly url: string;
  readonly preparedItemCount: number;
}
