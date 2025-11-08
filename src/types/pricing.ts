export type PriceListSummary = {
  priceListId: string;
  priceListName: string;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  jurisdictionType: string;
  jurisdictionValue: string | null;
  allowManualOverride: boolean;
};

export type CustomerPricingContext = {
  state?: string | null;
  territory?: string | null;
  accountNumber?: string | null;
  name?: string | null;
};
