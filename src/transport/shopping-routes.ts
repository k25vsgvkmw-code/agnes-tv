import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BasketService } from '../shopping/basket-service.js';
import type { CheckoutService } from '../shopping/checkout-service.js';
import type { ShoppingRepository } from '../shopping/shopping-repository.js';
import type { SupermarketHomeService } from '../shopping/supermarket-home.js';

export interface ShoppingRouteDependencies {
  readonly repository: ShoppingRepository;
  readonly basketService: BasketService;
  readonly checkoutService: CheckoutService;
  readonly homeService: SupermarketHomeService;
}

const createBasketSchema = z.object({
  householdId: z.string().uuid(),
  createdByPersonId: z.string().uuid(),
});

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  substitutionPolicy: z.enum(['exact_only', 'allow_equivalent', 'allow_any']).optional(),
  preferredListingId: z.string().uuid().optional(),
});

const checkoutSchema = z.object({
  quoteId: z.string().uuid(),
  createdByPersonId: z.string().uuid(),
});

export async function registerShoppingRoutes(
  app: FastifyInstance,
  dependencies: ShoppingRouteDependencies,
): Promise<void> {
  app.get('/shopping/home', async () => dependencies.homeService.getHome());

  app.get<{ Querystring: { limit?: string } }>('/shopping/offers', async (request) => {
    const parsed = Number(request.query.limit ?? '24');
    const limit = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 24;
    return dependencies.homeService.getHome(limit);
  });

  app.get<{ Querystring: { q?: string } }>('/shopping/products/search', async (request) => {
    const query = request.query.q?.trim() ?? '';
    if (!query) return { products: [] };
    return { products: await dependencies.repository.searchProducts(query, 30) };
  });

  app.get<{ Params: { id: string } }>('/shopping/products/:id/prices', async (request) => ({
    prices: await dependencies.repository.getPriceHistory(request.params.id),
  }));

  app.post('/shopping/baskets', async (request, reply) => {
    const input = createBasketSchema.parse(request.body);
    const basket = await dependencies.basketService.createBasket(input);
    return reply.code(201).send(basket);
  });

  app.get<{ Params: { id: string } }>('/shopping/baskets/:id', async (request, reply) => {
    const basket = await dependencies.repository.getBasket(request.params.id);
    if (!basket) return reply.code(404).send({ error: 'basket_not_found' });
    const items = await dependencies.repository.listBasketItems(basket.id);
    return { basket, items };
  });

  app.post<{ Params: { id: string } }>('/shopping/baskets/:id/items', async (request, reply) => {
    const input = addItemSchema.parse(request.body);
    const item = await dependencies.basketService.addItem(request.params.id, input);
    return reply.code(201).send(item);
  });

  app.delete<{ Params: { id: string; itemId: string } }>(
    '/shopping/baskets/:id/items/:itemId',
    async (request, reply) => {
      await dependencies.basketService.removeItem(request.params.id, request.params.itemId);
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { id: string } }>('/shopping/baskets/:id/quote', async (request) => ({
    quote: await dependencies.basketService.quoteBasket(request.params.id),
  }));

  app.post<{ Params: { id: string } }>('/shopping/baskets/:id/checkout', async (request) => {
    const input = checkoutSchema.parse(request.body);
    const basket = await dependencies.repository.getBasket(request.params.id);
    if (!basket) return { error: 'basket_not_found' };
    return dependencies.checkoutService.prepareCheckout(input.quoteId, input.createdByPersonId);
  });
}
