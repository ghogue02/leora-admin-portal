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

export type MinimumOrderPolicySource = "tenant" | "customer";

export type MinimumOrderPolicyClient = {
  enforcementEnabled: boolean;
  tenantAmount: number;
  appliedAmount: number;
  source: MinimumOrderPolicySource;
  overrideAmount: number | null;
};

export type OrderApprovalReasonCode =
  | "MIN_ORDER"
  | "INVENTORY"
  | "PRICING_OVERRIDE"
  | "MANUAL_PRICE";

export type OrderApprovalReason = {
  code: OrderApprovalReasonCode;
  summary: string;
  details?: string;
  metadata?: Record<string, unknown>;
};
