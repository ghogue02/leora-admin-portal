import type { PriceListSummary } from '@/types/pricing';

export type RecentPurchaseSuggestion = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  size: string | null;
  lastOrderedAt: string;
  lastQuantity: number;
  lastOrderId: string;
  lastOrderNumber: string | null;
  lastUnitPrice: number;
  priceMatchesStandard: boolean;
  priceOverridden: boolean;
  overrideReason: string | null;
  standardPrice: number | null;
  standardPriceListId: string | null;
  standardPriceListName: string | null;
  priceLists: PriceListSummary[];
  timesOrdered: number;
};
