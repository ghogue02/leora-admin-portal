import type { PriceListSummary, CustomerPricingContext } from '@/types/pricing';

export type { PriceListSummary, CustomerPricingContext };

export type PricingSelection = {
  priceList: PriceListSummary | null;
  unitPrice: number;
  overrideApplied: boolean;
  reason: string | null;
};

function matchesJurisdiction(priceList: PriceListSummary, customer?: CustomerPricingContext | null) {
  // GLOBAL price lists match everyone (with or without customer)
  if (priceList.jurisdictionType === "GLOBAL") return true;

  // Non-GLOBAL price lists require customer context
  if (!customer) return false;

  const value = (priceList.jurisdictionValue ?? "").trim().toUpperCase();
  const state = (customer.state ?? "").trim().toUpperCase();
  switch (priceList.jurisdictionType) {
    case "STATE":
      return Boolean(value) && Boolean(state) && value === state;
    case "FEDERAL_PROPERTY":
      return isFederalProperty(customer);
    case "CUSTOM":
      if (!value) return false;
      return [customer.territory, customer.accountNumber, customer.name]
        .filter(Boolean)
        .some((field) => field!.toString().toLowerCase().includes(value.toLowerCase()));
    default:
      return false;
  }
}

function isFederalProperty(customer: CustomerPricingContext) {
  const territory = (customer.territory ?? "").toLowerCase();
  const name = (customer.name ?? "").toLowerCase();
  return (
    territory.includes("federal") ||
    territory.includes("military") ||
    name.includes("air force") ||
    name.includes("naval") ||
    name.includes("army") ||
    name.includes("marine") ||
    name.includes("base")
  );
}

function meetsQuantity(priceList: PriceListSummary, quantity: number) {
  // For display purposes (quantity = 0), show the lowest tier price (min = 1)
  if (quantity === 0) {
    return (priceList.minQuantity ?? 1) === 1;
  }

  const min = priceList.minQuantity ?? 1;
  const max = priceList.maxQuantity ?? Infinity;
  return quantity >= min && quantity <= max;
}

export function resolvePriceForQuantity(
  priceLists: PriceListSummary[],
  quantity: number,
  customer?: CustomerPricingContext | null,
): PricingSelection {
  const sorted = (lists: PriceListSummary[]) =>
    [...lists].sort((a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0));

  const jurisdictionMatches = sorted(
    priceLists.filter((priceList) => meetsQuantity(priceList, quantity) && matchesJurisdiction(priceList, customer)),
  );
  if (jurisdictionMatches.length > 0) {
    return {
      priceList: jurisdictionMatches[0],
      unitPrice: jurisdictionMatches[0].price,
      overrideApplied: false,
      reason: null,
    };
  }

  const manualOverrideCandidates = sorted(
    priceLists.filter((priceList) => meetsQuantity(priceList, quantity) && priceList.allowManualOverride),
  );
  if (manualOverrideCandidates.length > 0) {
    return {
      priceList: manualOverrideCandidates[0],
      unitPrice: manualOverrideCandidates[0].price,
      overrideApplied: true,
      reason: "manualOverride",
    };
  }

  const fallback = sorted(priceLists.filter((priceList) => meetsQuantity(priceList, quantity)));
  if (fallback.length > 0) {
    return {
      priceList: fallback[0],
      unitPrice: fallback[0].price,
      overrideApplied: true,
      reason: "noJurisdictionMatch",
    };
  }

  return {
    priceList: null,
    unitPrice: 0,
    overrideApplied: true,
    reason: "noPriceConfigured",
  };
}

export function describePriceListForDisplay(priceList: PriceListSummary) {
  switch (priceList.jurisdictionType) {
    case "STATE":
      return `${priceList.priceListName} • State ${priceList.jurisdictionValue ?? "?"}`;
    case "FEDERAL_PROPERTY":
      return `${priceList.priceListName} • Federal property`;
    case "CUSTOM":
      return `${priceList.priceListName}${priceList.jurisdictionValue ? ` • ${priceList.jurisdictionValue}` : ""}`;
    default:
      return `${priceList.priceListName} • All customers`;
  }
}
