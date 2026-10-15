import type { MatchMethod, Product } from './shopping-types.js';
import { normalizePackageSize, normalizedIdentityText } from './unit-normalization.js';

export interface ProductCandidate {
  readonly title: string;
  readonly brand?: string;
  readonly packageText?: string;
  readonly gtin?: string;
}

export interface MatchDecision {
  readonly product: Product;
  readonly method: MatchMethod;
  readonly confidence: number;
  readonly exact: boolean;
}

function tokenSimilarity(a: string, b: string): number {
  const left = new Set(normalizedIdentityText(a).split(' ').filter(Boolean));
  const right = new Set(normalizedIdentityText(b).split(' ').filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;
  const common = [...left].filter((token) => right.has(token)).length;
  return common / Math.max(left.size, right.size);
}

function packageCompatible(product: Product, candidate: ProductCandidate): boolean {
  if (product.sizeValue === undefined || !product.sizeUnit || !candidate.packageText) return true;
  const normalized = normalizePackageSize(candidate.packageText);
  if (!normalized) return true;
  const unit = product.sizeUnit.toLowerCase();
  const canonicalUnit = unit === 'kg' || unit === 'g' ? 'kg' : unit === 'l' || unit === 'ml' ? 'l' : 'piece';
  const canonicalValue = unit === 'g' || unit === 'ml' ? product.sizeValue / 1000 : product.sizeValue;
  return normalized.unit === canonicalUnit && Math.abs(normalized.value - canonicalValue) <= 0.001;
}

export function matchProduct(
  candidate: ProductCandidate,
  products: readonly Product[],
): MatchDecision | null {
  if (candidate.gtin) {
    const gtin = products.find((product) => product.gtin === candidate.gtin);
    if (gtin) return { product: gtin, method: 'gtin', confidence: 1, exact: true };
  }

  const candidateBrand = normalizedIdentityText(candidate.brand ?? '');
  const normalizedName = normalizedIdentityText(candidate.title);
  const exact = products.find((product) => {
    const brandMatches = !candidateBrand || normalizedIdentityText(product.brand ?? '') === candidateBrand;
    return (
      brandMatches &&
      normalizedIdentityText(product.canonicalName) === normalizedName &&
      packageCompatible(product, candidate)
    );
  });
  if (exact) return { product: exact, method: 'normalized_identity', confidence: 0.96, exact: true };

  let best: { product: Product; score: number } | undefined;
  for (const product of products) {
    const score = tokenSimilarity(candidate.title, product.canonicalName);
    const brandPenalty =
      candidateBrand && product.brand && normalizedIdentityText(product.brand) !== candidateBrand ? 0.15 : 0;
    const packagePenalty = packageCompatible(product, candidate) ? 0 : 0.2;
    const adjusted = Math.max(0, score - brandPenalty - packagePenalty);
    if (!best || adjusted > best.score) best = { product, score: adjusted };
  }

  if (best && best.score >= 0.72) {
    return {
      product: best.product,
      method: 'fuzzy_alternative',
      confidence: Math.min(0.89, best.score),
      exact: false,
    };
  }
  return null;
}
