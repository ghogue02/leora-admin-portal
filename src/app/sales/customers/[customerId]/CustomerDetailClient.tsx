"use client";

import Link from "next/link";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import dynamic from "next/dynamic";
import CustomerHeader from "./sections/CustomerHeader";
import CustomerMetrics from "./sections/CustomerMetrics";
import OrderingPaceIndicator from "./sections/OrderingPaceIndicator";
import TopProducts from "./sections/TopProducts";
import ProductRecommendations from "./sections/ProductRecommendations";
import SampleHistory from "./sections/SampleHistory";
import ActivityTimeline from "./sections/ActivityTimeline";
import QuickActions from "./sections/QuickActions";
import OrderHistory from "./sections/OrderHistory";
import AccountHolds from "./sections/AccountHolds";
import CustomerContextSetter from "./sections/CustomerContextSetter";
import OrderDeepDive from "./sections/OrderDeepDive";
import CustomerInsights from "./sections/CustomerInsights";
import CustomerTagManager from "./sections/CustomerTagManager";
import {
  CustomerHeaderSkeleton,
  CustomerMetricsSkeleton,
  OrderHistorySkeleton,
  ActivityTimelineSkeleton,
  TopProductsSkeleton,
} from "./components/LoadingSkeletons";

const ProductHistoryReports = dynamic(() => import("./sections/ProductHistoryReports"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
      <div className="mt-4 h-96 animate-pulse rounded bg-gray-100"></div>
    </div>
  ),
});

export default function CustomerDetailClient({
  customerId,
}: {
  customerId: string;
}) {
  const { data, isLoading, error } = useCustomerDetail(customerId);

  if (error) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">Error Loading Customer</h2>
          <p className="mt-2 text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load customer data"}
          </p>
          <Link
            href="/sales/customers"
            className="mt-4 inline-block text-sm font-medium text-red-900 hover:underline"
          >
            Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading || !data) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
        {/* Breadcrumb Skeleton */}
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
          <span>/</span>
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          <span>/</span>
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
        </nav>

        <CustomerHeaderSkeleton />
        <CustomerMetricsSkeleton />
        <div className="h-32 animate-pulse rounded-lg bg-gray-100"></div>
        <div className="h-20 animate-pulse rounded-lg bg-gray-100"></div>
        <div className="h-32 animate-pulse rounded-lg bg-gray-100"></div>
        <TopProductsSkeleton />
        <TopProductsSkeleton />
        <ActivityTimelineSkeleton />
        <OrderHistorySkeleton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Set customer context for cart and other features */}
      <CustomerContextSetter customerId={customerId} />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link
          href="/sales/dashboard"
          className="hover:text-gray-900 hover:underline"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/sales/customers"
          className="hover:text-gray-900 hover:underline"
        >
          Customers
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-900">{data.customer.name}</span>
      </nav>

      {/* Customer Header */}
      <CustomerHeader customer={data.customer} />

      {/* Customer Tags */}
      <CustomerTagManager customerId={customerId} />

      {/* Performance Metrics */}
      <CustomerMetrics
        metrics={{
          ytdRevenue: data.metrics.ytdRevenue,
          totalOrders: data.metrics.totalOrders,
          avgOrderValue: data.metrics.avgOrderValue,
          outstandingBalance: data.metrics.outstandingBalance,
        }}
      />

      {/* Ordering Pace Indicator */}
      <OrderingPaceIndicator
        metrics={{
          lastOrderDate: data.metrics.lastOrderDate,
          nextExpectedOrderDate: data.metrics.nextExpectedOrderDate,
          averageOrderIntervalDays: data.metrics.averageOrderIntervalDays,
          daysSinceLastOrder: data.metrics.daysSinceLastOrder,
          daysUntilExpected: data.metrics.daysUntilExpected,
        }}
      />

      {/* Quick Actions */}
      <QuickActions
        customerId={customerId}
        isPermanentlyClosed={data.customer.isPermanentlyClosed}
        customerName={data.customer.name}
      />

      {/* Account Holds/Balances */}
      <AccountHolds
        invoices={data.invoices}
        outstandingBalance={data.metrics.outstandingBalance}
      />

      {/* Top Products */}
      <TopProducts topProducts={data.topProducts} />

      {/* Product Recommendations */}
      <ProductRecommendations recommendations={data.recommendations} />

      {/* Sample History */}
      <SampleHistory samples={data.samples} />

      {/* AI-Powered Customer Insights */}
      <CustomerInsights customerId={customerId} />

      {/* Order Deep Dive - Product Breakdown */}
      <OrderDeepDive customerId={customerId} />

      {/* Product History Reports */}
      <ProductHistoryReports customerId={customerId} />

      {/* Activity Timeline */}
      <ActivityTimeline
        activities={data.activities}
        customerId={customerId}
        customerName={data.customer.name}
      />

      {/* Order History */}
      <OrderHistory orders={data.orders} />
    </main>
  );
}
