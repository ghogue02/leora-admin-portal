"use client";

import { useQuery } from "@tanstack/react-query";

interface CustomerDetailData {
  customer: {
    id: string;
    name: string;
    accountNumber: string | null;
    externalId: string | null;
    riskStatus: string;
    phone: string | null;
    billingEmail: string | null;
    address: {
      street1: string | null;
      street2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    };
    salesRep: {
      id: string;
      name: string;
      territory: string;
    } | null;
    isPermanentlyClosed: boolean;
    closedReason: string | null;
  };
  metrics: {
    ytdRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    averageOrderIntervalDays: number | null;
    daysSinceLastOrder: number | null;
    daysUntilExpected: number | null;
    outstandingBalance: number;
  };
  topProducts: {
    byRevenue: Array<{
      skuId: string;
      skuCode: string;
      productName: string;
      brand: string;
      totalCases: number;
      revenue: number;
      orderCount: number;
    }>;
    byCases: Array<{
      skuId: string;
      skuCode: string;
      productName: string;
      brand: string;
      totalCases: number;
      revenue: number;
      orderCount: number;
    }>;
  };
  recommendations: Array<{
    skuId: string;
    skuCode: string;
    productName: string;
    brand: string;
    category: string | null;
    rank: number;
    calculationMode: string;
  }>;
  samples: Array<{
    id: string;
    skuCode: string;
    productName: string;
    brand: string;
    quantity: number;
    tastedAt: string;
    feedback: string | null;
    needsFollowUp: boolean;
    followedUpAt: string | null;
    resultedInOrder: boolean;
    salesRepName: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    typeCode: string;
    subject: string;
    notes: string | null;
    occurredAt: string;
    followUpAt: string | null;
    outcome: string | null;
    outcomes: string[];
    userName: string;
    relatedOrder: {
      id: string;
      orderedAt: string | null;
      total: number;
    } | null;
  }>;
  orders: Array<{
    id: string;
    orderedAt: string | null;
    deliveredAt: string | null;
    status: string;
    total: number;
    lineCount: number;
    invoices: Array<{
      id: string;
      invoiceNumber: string | null;
      status: string;
      total: number;
      issuedAt: string | null;
    }>;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    status: string;
    total: number;
    dueDate: string | null;
    issuedAt: string | null;
    daysOverdue: number;
  }>;
  btgPlacements: Array<{
    skuId: string;
    skuCode: string;
    productName: string;
    brand: string | null;
    category: string | null;
    supplierName: string | null;
    totalUnits: number;
    orderCount: number;
    recentUnits: number;
    averageMonthlyUnits: number;
    firstOrderDate: string | null;
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null;
    isActivePlacement: boolean;
  }>;
}

async function fetchCustomerDetail(
  customerId: string
): Promise<CustomerDetailData> {
  const response = await fetch(`/api/sales/customers/${customerId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customer: ${response.statusText}`);
  }

  return response.json();
}

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => fetchCustomerDetail(customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
