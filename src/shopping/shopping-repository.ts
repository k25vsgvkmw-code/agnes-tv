import type {
  Basket,
  BasketItem,
  BasketQuote,
  CheckoutSession,
  ImportFailure,
  Offer,
  PriceObservation,
  Product,
  ProductMatch,
  Retailer,
  RetailerListing,
  RetailerSlug,
} from './shopping-types.js';

export type NewRetailer = Omit<Retailer, 'id'>;
export type NewProduct = Omit<Product, 'id'>;
export type NewRetailerListing = Omit<RetailerListing, 'id'>;
export type NewPriceObservation = Omit<PriceObservation, 'id'>;
export type NewOffer = Omit<Offer, 'id'>;
export type NewBasket = Omit<Basket, 'id'>;
export type NewBasketItem = Omit<BasketItem, 'id'>;
export type NewBasketQuote = Omit<BasketQuote, 'id'>;
export type NewCheckoutSession = Omit<CheckoutSession, 'id'>;
export type NewProductMatch = Omit<ProductMatch, 'id'>;
export type NewImportFailure = Omit<ImportFailure, 'id'>;

export interface ShoppingRepository {
  upsertRetailer(input: NewRetailer): Promise<Retailer>;
  findRetailerBySlug(slug: RetailerSlug): Promise<Retailer | null>;
  getRetailer(id: string): Promise<Retailer | null>;
  listRetailers(): Promise<readonly Retailer[]>;

  createProduct(input: NewProduct): Promise<Product>;
  getProduct(id: string): Promise<Product | null>;
  findProductByGtin(gtin: string): Promise<Product | null>;
  searchProducts(query: string, limit: number): Promise<readonly Product[]>;

  upsertListing(input: NewRetailerListing): Promise<RetailerListing>;
  findListing(retailerSlug: RetailerSlug, externalId: string): Promise<RetailerListing | null>;
  getListingById(id: string): Promise<RetailerListing | null>;
  listListingsForProduct(productId: string): Promise<readonly RetailerListing[]>;

  appendPriceObservation(input: NewPriceObservation): Promise<PriceObservation>;
  latestPriceForListing(retailerListingId: string): Promise<PriceObservation | null>;
  getPriceHistory(productId: string): Promise<readonly PriceObservation[]>;

  upsertOffer(input: NewOffer): Promise<Offer>;
  listOffers(limit: number): Promise<readonly Offer[]>;

  createBasket(input: NewBasket): Promise<Basket>;
  getBasket(id: string): Promise<Basket | null>;
  addBasketItem(input: NewBasketItem): Promise<BasketItem>;
  removeBasketItem(basketId: string, itemId: string): Promise<void>;
  listBasketItems(basketId: string): Promise<readonly BasketItem[]>;

  saveBasketQuote(input: NewBasketQuote): Promise<BasketQuote>;
  getBasketQuote(id: string): Promise<BasketQuote | null>;
  saveCheckoutSession(input: NewCheckoutSession): Promise<CheckoutSession>;

  saveProductMatch(input: NewProductMatch): Promise<ProductMatch>;
  recordImportFailure(input: NewImportFailure): Promise<ImportFailure>;
}
