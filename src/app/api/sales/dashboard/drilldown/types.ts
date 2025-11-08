export type DrilldownCustomer = {
  id: string;
  name: string;
  accountNumber: string | null;
  city: string | null;
  state: string | null;
};

export type DrilldownOrderSummary = {
  id: string;
  total: number;
  deliveredAt: string | null;
  status: string;
};

export type CustomerRevenueAggregate<TExtra extends object = Record<string, never>> = {
  customer: DrilldownCustomer;
  revenue: number;
  orderCount: number;
  orders: DrilldownOrderSummary[];
} & TExtra;

export type ProductSalesEntry = {
  productName: string;
  brand: string | null;
  category: string | null;
  skuCode: string;
  quantity: number;
  revenue: number;
  orderCount: number;
};

export type ProductSalesMap = Record<string, ProductSalesEntry>;
