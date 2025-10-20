import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
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

type PageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

async function getCustomerData(customerId: string) {
  const cookieStore = await cookies();

  // Build cookie header for server-side fetch
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const res = await fetch(`http://localhost:3000/api/sales/customers/${customerId}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      return null;
    }
    console.error("Failed to fetch customer data:", await res.text());
    throw new Error("Failed to fetch customer data");
  }

  return res.json();
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params;
  const data = await getCustomerData(customerId);

  if (!data) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
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

      {/* Activity Timeline */}
      <ActivityTimeline activities={data.activities} />

      {/* Order History */}
      <OrderHistory orders={data.orders} />
    </main>
  );
}
