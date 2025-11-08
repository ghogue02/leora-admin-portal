import type { PriceListSummary } from '@/types/pricing';
import type { RecentPurchaseSuggestion } from '@/types/orders';

export type RawRecentOrderLine = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  overridePrice: number | null;
  priceOverridden: boolean;
  overrideReason: string | null;
  orderId: string;
  orderNumber: string | null;
  orderedAt: string;
  priceLists: PriceListSummary[];
};

export type CustomerPricingSnapshot = {
  state: string | null;
  territory: string | null;
  accountNumber: string | null;
  name: string;
};

type PriceSelection = {
  priceList: PriceListSummary | null;
  overrideApplied: boolean;
};

const PRICE_MATCH_TOLERANCE = 0.01;

export function aggregateRecentOrderLines(
  lines: RawRecentOrderLine[],
  customer: CustomerPricingSnapshot,
  limit = 20,
): RecentPurchaseSuggestion[] {
  const sortedLines = [...lines].sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  const suggestions = new Map<string, RecentPurchaseSuggestion>();

  for (const line of sortedLines) {
    const latestUnitPrice = (line.overridePrice ?? line.unitPrice) || 0;
    const priceSelection = selectPriceListItem(line.priceLists, Math.max(1, line.quantity), customer);
    const standardPrice = priceSelection.priceList ? priceSelection.priceList.price : null;
    const priceMatchesStandard =
      typeof standardPrice === 'number' ? Math.abs(standardPrice - latestUnitPrice) < PRICE_MATCH_TOLERANCE : false;

    if (!suggestions.has(line.skuId)) {
      suggestions.set(line.skuId, {
        skuId: line.skuId,
        skuCode: line.skuCode,
        productName: line.productName,
        brand: line.brand,
        size: line.size,
        lastOrderedAt: line.orderedAt,
        lastQuantity: Math.max(1, line.quantity),
        lastOrderId: line.orderId,
        lastOrderNumber: line.orderNumber,
        lastUnitPrice: latestUnitPrice,
        priceMatchesStandard,
        priceOverridden: line.priceOverridden,
        overrideReason: line.overrideReason,
        standardPrice,
        standardPriceListId: priceSelection.priceList?.priceListId ?? null,
        standardPriceListName: priceSelection.priceList?.priceListName ?? null,
        priceLists: line.priceLists,
        timesOrdered: 1,
      });
    } else {
      const existing = suggestions.get(line.skuId)!;
      existing.timesOrdered += 1;
    }
  }

  return Array.from(suggestions.values())
    .sort((a, b) => {
      const dateDiff = new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.timesOrdered - a.timesOrdered;
    })
    .slice(0, limit);
}

function selectPriceListItem(
  priceLists: PriceListSummary[],
  quantity: number,
  customer: CustomerPricingSnapshot,
): PriceSelection {
  const sorted = (lists: PriceListSummary[]) => [...lists].sort((a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0));

  const jurisdictionMatches = sorted(
    priceLists.filter(
      (priceList) => meetsQuantity(priceList, quantity) && matchesJurisdiction(priceList, customer),
    ),
  );

  if (jurisdictionMatches.length > 0) {
    return { priceList: jurisdictionMatches[0], overrideApplied: false };
  }

  const manualOverrideCandidates = sorted(
    priceLists.filter((priceList) => meetsQuantity(priceList, quantity) && priceList.allowManualOverride),
  );

  if (manualOverrideCandidates.length > 0) {
    return { priceList: manualOverrideCandidates[0], overrideApplied: true };
  }

  const fallback = sorted(priceLists.filter((priceList) => meetsQuantity(priceList, quantity)));
  if (fallback.length > 0) {
    return { priceList: fallback[0], overrideApplied: true };
  }

  return { priceList: null, overrideApplied: true };
}

function meetsQuantity(priceList: PriceListSummary, quantity: number) {
  const min = priceList.minQuantity ?? 1;
  const max = priceList.maxQuantity ?? Infinity;
  return quantity >= min && quantity <= max;
}

function matchesJurisdiction(priceList: PriceListSummary, customer: CustomerPricingSnapshot) {
  const value = (priceList.jurisdictionValue ?? '').trim().toUpperCase();
  const state = (customer.state ?? '').trim().toUpperCase();
  switch (priceList.jurisdictionType) {
    case 'STATE':
      return Boolean(value) && Boolean(state) && value === state;
    case 'FEDERAL_PROPERTY':
      return isFederalPropertyCustomer(customer);
    case 'CUSTOM':
      if (!value) return false;
      return [customer.territory, customer.accountNumber, customer.name]
        .filter(Boolean)
        .some((field) => field!.toString().toLowerCase().includes(value.toLowerCase()));
    default:
      return true;
  }
}

function isFederalPropertyCustomer(customer: CustomerPricingSnapshot) {
  const territory = (customer.territory ?? '').toLowerCase();
  const name = (customer.name ?? '').toLowerCase();
  return (
    territory.includes('federal') ||
    territory.includes('military') ||
    name.includes('air force') ||
    name.includes('naval') ||
    name.includes('army') ||
    name.includes('marine') ||
    name.includes('base')
  );
}
