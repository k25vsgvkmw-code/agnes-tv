export interface PublicProduct {
  readonly externalId: string;
  readonly title: string;
  readonly brand?: string;
  readonly packageText?: string;
  readonly imageUrl?: string;
  readonly externalUrl?: string;
  readonly gtin?: string;
  readonly price?: number;
  readonly referencePrice?: number;
  readonly currency?: 'EUR';
  readonly providerOfferId?: string;
  readonly offerHeadline?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly membershipRequired?: boolean;
  readonly category?: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function firstObject(value: unknown): JsonObject | undefined {
  if (isObject(value)) return value;
  if (Array.isArray(value)) return value.find(isObject);
  return undefined;
}

function imageValue(value: unknown): string | undefined {
  if (typeof value === 'string') return stringValue(value);
  if (Array.isArray(value)) return value.map(stringValue).find((item): item is string => item !== undefined);
  const object = firstObject(value);
  return object ? stringValue(object.url) : undefined;
}

function brandValue(value: unknown): string | undefined {
  if (typeof value === 'string') return stringValue(value);
  const object = firstObject(value);
  return object ? stringValue(object.name) : undefined;
}

function typesOf(object: JsonObject): readonly string[] {
  const value = object['@type'];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function collectProductObjects(value: unknown, result: JsonObject[]): void {
  if (Array.isArray(value)) {
    for (const child of value) collectProductObjects(child, result);
    return;
  }
  if (!isObject(value)) return;
  if (typesOf(value).some((type) => type.toLowerCase() === 'product')) result.push(value);
  for (const child of Object.values(value)) collectProductObjects(child, result);
}

function fromProductObject(product: JsonObject): PublicProduct | null {
  const title = stringValue(product.name);
  if (!title) return null;
  const offers = firstObject(product.offers);
  const price = numberValue(offers?.price ?? offers?.lowPrice ?? product.price);
  const referencePrice = numberValue(offers?.highPrice ?? product.referencePrice);
  const gtin =
    stringValue(product.gtin13) ?? stringValue(product.gtin14) ?? stringValue(product.gtin12) ?? stringValue(product.gtin);
  const externalId =
    stringValue(product.sku) ?? stringValue(product.productID) ?? gtin ?? stringValue(product.url) ?? title;
  const currencyValue = stringValue(offers?.priceCurrency)?.toUpperCase();
  return {
    externalId,
    title,
    ...(brandValue(product.brand) ? { brand: brandValue(product.brand)! } : {}),
    ...(stringValue(product.size) ? { packageText: stringValue(product.size)! } : {}),
    ...(imageValue(product.image) ? { imageUrl: imageValue(product.image)! } : {}),
    ...(stringValue(product.url) ? { externalUrl: stringValue(product.url)! } : {}),
    ...(gtin ? { gtin } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(referencePrice !== undefined && referencePrice > (price ?? -Infinity) ? { referencePrice } : {}),
    ...(currencyValue === 'EUR' ? { currency: 'EUR' as const } : {}),
    ...(stringValue(product.category) ? { category: stringValue(product.category)! } : {}),
  };
}

function parseJsonScripts(html: string, selector: RegExp): unknown[] {
  const values: unknown[] = [];
  for (const match of html.matchAll(selector)) {
    const raw = match[1];
    if (!raw) continue;
    try {
      values.push(JSON.parse(raw) as unknown);
    } catch {
      continue;
    }
  }
  return values;
}

export function parsePublicProducts(html: string): readonly PublicProduct[] {
  const products: PublicProduct[] = [];
  const structured = parseJsonScripts(
    html,
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const value of structured) {
    const objects: JsonObject[] = [];
    collectProductObjects(value, objects);
    for (const object of objects) {
      const product = fromProductObject(object);
      if (product) products.push(product);
    }
  }

  const fixtureDocuments = parseJsonScripts(
    html,
    /<script[^>]*data-agnes-shopping[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const document of fixtureDocuments) {
    if (!Array.isArray(document)) continue;
    for (const item of document) {
      if (!isObject(item)) continue;
      const title = stringValue(item.title);
      const externalId = stringValue(item.externalId);
      if (!title || !externalId) continue;
      const price = numberValue(item.price);
      const referencePrice = numberValue(item.referencePrice);
      products.push({
        externalId,
        title,
        ...(stringValue(item.brand) ? { brand: stringValue(item.brand)! } : {}),
        ...(stringValue(item.packageText) ? { packageText: stringValue(item.packageText)! } : {}),
        ...(stringValue(item.imageUrl) ? { imageUrl: stringValue(item.imageUrl)! } : {}),
        ...(stringValue(item.externalUrl) ? { externalUrl: stringValue(item.externalUrl)! } : {}),
        ...(stringValue(item.gtin) ? { gtin: stringValue(item.gtin)! } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(referencePrice !== undefined ? { referencePrice } : {}),
        currency: 'EUR',
        ...(stringValue(item.providerOfferId) ? { providerOfferId: stringValue(item.providerOfferId)! } : {}),
        ...(stringValue(item.offerHeadline) ? { offerHeadline: stringValue(item.offerHeadline)! } : {}),
        ...(stringValue(item.startsAt) ? { startsAt: stringValue(item.startsAt)! } : {}),
        ...(stringValue(item.endsAt) ? { endsAt: stringValue(item.endsAt)! } : {}),
        ...(typeof item.membershipRequired === 'boolean'
          ? { membershipRequired: item.membershipRequired }
          : {}),
        ...(stringValue(item.category) ? { category: stringValue(item.category)! } : {}),
      });
    }
  }

  const unique = new Map<string, PublicProduct>();
  for (const product of products) unique.set(product.externalId, product);
  return [...unique.values()];
}
