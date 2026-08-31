import type { BasketRetailerSegment, BasketStrategy, RetailerSlug } from './shopping-types.js';

export interface BasketPriceOption {
  readonly retailerId: string;
  readonly retailerSlug: RetailerSlug;
  readonly retailerListingId: string;
  readonly unitPrice: number;
  readonly feeEstimate?: number;
}

export interface PricedBasketItem {
  readonly basketItemId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly options: readonly BasketPriceOption[];
}

export interface BasketOptimizerPolicy {
  readonly minimumSplitSavingEuro: number;
  readonly maximumRetailerCount: number;
  readonly frictionPenaltyEuro: number;
}

export interface BasketOptimization {
  readonly strategy: BasketStrategy;
  readonly retailerSegments: readonly BasketRetailerSegment[];
  readonly unresolvedItemIds: readonly string[];
  readonly itemsSubtotal: number;
  readonly feesEstimate: number;
  readonly totalEstimate: number;
  readonly baselineTotal?: number;
  readonly estimatedSaving?: number;
}

const DEFAULT_POLICY: BasketOptimizerPolicy = {
  minimumSplitSavingEuro: 3,
  maximumRetailerCount: 2,
  frictionPenaltyEuro: 0,
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSegments(
  items: readonly PricedBasketItem[],
  selection: ReadonlyMap<string, BasketPriceOption>,
): readonly BasketRetailerSegment[] {
  const grouped = new Map<
    string,
    { retailerSlug: RetailerSlug; items: BasketRetailerSegment['items']; feeEstimate: number }
  >();
  for (const item of items) {
    const selected = selection.get(item.basketItemId);
    if (!selected) continue;
    const current = grouped.get(selected.retailerId) ?? {
      retailerSlug: selected.retailerSlug,
      items: [],
      feeEstimate: selected.feeEstimate ?? 0,
    };
    const total = money(selected.unitPrice * item.quantity);
    const nextItems = [
      ...current.items,
      {
        basketItemId: item.basketItemId,
        productId: item.productId,
        retailerListingId: selected.retailerListingId,
        quantity: item.quantity,
        unitPrice: selected.unitPrice,
        total,
      },
    ];
    grouped.set(selected.retailerId, {
      retailerSlug: current.retailerSlug,
      items: nextItems,
      feeEstimate: Math.max(current.feeEstimate, selected.feeEstimate ?? 0),
    });
  }

  return [...grouped.entries()].map(([retailerId, value]) => {
    const subtotal = money(value.items.reduce((sum, item) => sum + item.total, 0));
    return {
      retailerId,
      retailerSlug: value.retailerSlug,
      items: value.items,
      subtotal,
      ...(value.feeEstimate > 0 ? { feeEstimate: value.feeEstimate } : {}),
      total: money(subtotal + value.feeEstimate),
    };
  });
}

function totals(segments: readonly BasketRetailerSegment[]) {
  const itemsSubtotal = money(segments.reduce((sum, segment) => sum + segment.subtotal, 0));
  const feesEstimate = money(segments.reduce((sum, segment) => sum + (segment.feeEstimate ?? 0), 0));
  return { itemsSubtotal, feesEstimate, totalEstimate: money(itemsSubtotal + feesEstimate) };
}

export function optimizeBasket(
  items: readonly PricedBasketItem[],
  policy: BasketOptimizerPolicy = DEFAULT_POLICY,
): BasketOptimization {
  const unresolvedItemIds = items.filter((item) => item.options.length === 0).map((item) => item.basketItemId);
  const satisfiable = items.filter((item) => item.options.length > 0);

  const retailerIds = new Set(satisfiable.flatMap((item) => item.options.map((option) => option.retailerId)));
  let bestSingle:
    | { segments: readonly BasketRetailerSegment[]; total: number; selection: Map<string, BasketPriceOption> }
    | undefined;

  for (const retailerId of retailerIds) {
    const selection = new Map<string, BasketPriceOption>();
    let complete = true;
    for (const item of satisfiable) {
      const option = item.options
        .filter((candidate) => candidate.retailerId === retailerId)
        .sort((a, b) => a.unitPrice - b.unitPrice)[0];
      if (!option) {
        complete = false;
        break;
      }
      selection.set(item.basketItemId, option);
    }
    if (!complete) continue;
    const segments = buildSegments(satisfiable, selection);
    const total = totals(segments).totalEstimate;
    if (!bestSingle || total < bestSingle.total) bestSingle = { segments, total, selection };
  }

  const splitSelection = new Map<string, BasketPriceOption>();
  for (const item of satisfiable) {
    const option = [...item.options].sort((a, b) => a.unitPrice - b.unitPrice)[0];
    if (option) splitSelection.set(item.basketItemId, option);
  }
  const splitSegments = buildSegments(satisfiable, splitSelection);
  const splitTotals = totals(splitSegments);
  const adjustedSplitTotal = money(
    splitTotals.totalEstimate + Math.max(0, splitSegments.length - 1) * policy.frictionPenaltyEuro,
  );

  const splitAllowed = splitSegments.length <= policy.maximumRetailerCount;
  const savingAgainstSingle = bestSingle ? money(bestSingle.total - adjustedSplitTotal) : undefined;
  const useSplit =
    !bestSingle ||
    (splitAllowed && savingAgainstSingle !== undefined && savingAgainstSingle >= policy.minimumSplitSavingEuro);

  if (useSplit && splitAllowed) {
    return {
      strategy: splitSegments.length > 1 ? 'split_retailer' : 'single_retailer',
      retailerSegments: splitSegments,
      unresolvedItemIds,
      ...splitTotals,
      ...(bestSingle ? { baselineTotal: bestSingle.total } : {}),
      ...(savingAgainstSingle !== undefined && savingAgainstSingle > 0
        ? { estimatedSaving: savingAgainstSingle }
        : {}),
    };
  }

  if (bestSingle) {
    const singleTotals = totals(bestSingle.segments);
    return {
      strategy: 'single_retailer',
      retailerSegments: bestSingle.segments,
      unresolvedItemIds,
      ...singleTotals,
      baselineTotal: bestSingle.total,
      estimatedSaving: 0,
    };
  }

  return {
    strategy: 'split_retailer',
    retailerSegments: splitSegments,
    unresolvedItemIds,
    ...splitTotals,
  };
}
