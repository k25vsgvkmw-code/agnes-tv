import type { z } from 'zod';
import type { shoppingRecordSchema } from '../../shopping/shopping-schemas.js';

export type ShoppingRecord = z.output<typeof shoppingRecordSchema>;

export interface RevalidateBasketAction {
  readonly kind: 'revalidate_basket';
  readonly items: readonly { externalId: string; quantity: number }[];
}

export interface PrepareCheckoutHandoffAction {
  readonly kind: 'prepare_checkout_handoff';
  readonly items: readonly { externalId: string; quantity: number }[];
}

export type ShoppingAction = RevalidateBasketAction | PrepareCheckoutHandoffAction;

export interface CheckoutHandoffResult {
  readonly mode: 'retailer_handoff' | 'prefilled_handoff';
  readonly url: string;
  readonly preparedItemCount: number;
}
