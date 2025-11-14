"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import { useCustomerRealtime } from "@/hooks/useCustomerRealtime";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Activity,
  Info
} from "lucide-react";
import { TabNavigation, type Tab } from "@/components/ui/TabNavigation";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
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
import CustomerTasks from "./sections/CustomerTasks";
import BtgPlacements from "./sections/BtgPlacements";
import SampleFollowUpList, { SampleFollowUpItem } from "./sections/SampleFollowUpList";
import SampleQuickLogPanel from "./sections/SampleQuickLogPanel";
import { CustomerClassificationCard } from "./sections/CustomerClassificationCard";
import { DeliveryPreferences } from "./sections/DeliveryPreferences";
import { CustomerContactsManager } from "@/components/customers/CustomerContactsManager";
import { GoogleProfileCard } from "./sections/GoogleProfileCard";
import CustomerSinceCard from "./sections/CustomerSinceCard";
import { CustomerPrioritySelector } from "./sections/CustomerPrioritySelector";
import PermanentNotesPanel from "./sections/PermanentNotesPanel";
import {
  CustomerHeaderSkeleton,
  CustomerMetricsSkeleton,
  OrderHistorySkeleton,
  ActivityTimelineSkeleton,
  TopProductsSkeleton,
  ProductRecommendationsSkeleton,
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

export default function CustomerDetailClientV2({
  customerId,
}: {
  customerId: string;
}) {
  const router = useRouter();
  const { data, isLoading, error } = useCustomerDetail(customerId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const fullHistorySectionId = "full-order-history";

  useCustomerRealtime({
    customerId,
    channel: data?.realtimeChannels?.orders,
  });

  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      id: "orders",
      label: "Orders & Actions",
      icon: <ShoppingCart className="h-4 w-4" />,
      badge: data?.orders?.length || 0
    },
    {
      id: "products",
      label: "Products",
      icon: <Package className="h-4 w-4" />,
      badge: data?.followUps?.length || 0
    },
    {
      id: "activity",
      label: "Activity & Insights",
      icon: <Activity className="h-4 w-4" />,
      badge: data?.activities?.length || 0
    },
    {
      id: "details",
      label: "Details",
      icon: <Info className="h-4 w-4" />
    },
  ];

  const handleFollowUpComplete = async (item: SampleFollowUpItem) => {
    try {
      let response: Response;
      if (item.source === "activity" && item.activityId && item.sampleItemId) {
        response = await fetch(
          `/api/sales/activities/${item.activityId}/samples/${item.sampleItemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ followUpCompleted: true }),
          }
        );
      } else if (item.source === "sample_usage" && item.sampleUsageId) {
        response = await fetch(`/api/sales/samples/${item.sampleUsageId}/follow-up`, {
          method: "PUT",
        });
      } else {
        throw new Error("Unsupported follow-up item.");
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update follow-up");
      }

      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    } catch (err) {
      console.error("Failed to mark follow-up complete", err);
      alert("Could not mark item as completed. Please try again.");
    }
  };

  const handleAddOrderClick = () => {
    const targetUrl = `/sales/orders/new?customerId=${encodeURIComponent(customerId)}`;
    router.push(targetUrl);
  };

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
        <CustomerHeaderSkeleton />
        <div className="animate-pulse rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
          <div className="mb-4 h-6 w-48 rounded bg-amber-200"></div>
        </div>
        <CustomerMetricsSkeleton />
        <OrderHistorySkeleton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      <CustomerContextSetter customerId={customerId} />

      {/* ALWAYS VISIBLE: Critical Information */}
      <CustomerHeader
        customer={data.customer}
        onAddOrder={handleAddOrderClick}
        metrics={{
          ytdRevenue: data.metrics.ytdRevenue,
          totalOrders: data.metrics.totalOrders,
          avgOrderValue: data.metrics.avgOrderValue,
          lastOrderDate: data.metrics.lastOrderDate,
          daysSinceLastOrder: data.metrics.daysSinceLastOrder,
          daysUntilExpected: data.metrics.daysUntilExpected,
        }}
        tags={data.customer.tags?.map((t: { name: string }) => t.name) || []}
      />

      {data.majorChanges && data.majorChanges.length > 0 && (
        <PermanentNotesPanel notes={data.majorChanges} />
      )}

      <CustomerPrioritySelector
        customerId={customerId}
        initialPriority={data.customer.accountPriority ?? null}
        initialManualOverride={data.customer.accountPriorityManuallySet}
        autoAssignedAt={data.customer.accountPriorityAutoAssignedAt}
      />

      <CustomerTasks customerId={customerId} tasks={data.tasks} />

      {data.invoices && data.invoices.length > 0 && data.metrics.outstandingBalance > 0 && (
        <AccountHolds
          invoices={data.invoices}
          outstandingBalance={data.metrics.outstandingBalance}
        />
      )}

      {/* TAB NAVIGATION */}
      <div className="sticky top-0 z-10 bg-slate-50 pt-4 pb-2">
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Recent Orders + Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OrderHistory
                orders={data.orders}
                customerId={customerId}
                isCompact={true}
                fullHistorySectionId={fullHistorySectionId}
              />
              <div className="space-y-4">
                <CollapsibleSection title="Detailed Metrics" defaultOpen={true}>
                  <CustomerMetrics
                    metrics={{
                      ytdRevenue: data.metrics.ytdRevenue,
                      totalOrders: data.metrics.totalOrders,
                      avgOrderValue: data.metrics.avgOrderValue,
                      outstandingBalance: data.metrics.outstandingBalance,
                    }}
                  />
                </CollapsibleSection>
                <CollapsibleSection title="Ordering Pace Analysis" defaultOpen={true}>
                  <OrderingPaceIndicator
                    metrics={{
                      lastOrderDate: data.metrics.lastOrderDate,
                      nextExpectedOrderDate: data.metrics.nextExpectedOrderDate,
                      averageOrderIntervalDays: data.metrics.averageOrderIntervalDays,
                      daysSinceLastOrder: data.metrics.daysSinceLastOrder,
                      daysUntilExpected: data.metrics.daysUntilExpected,
                    }}
                  />
                </CollapsibleSection>
              </div>
            </div>

            {/* Customer Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CollapsibleSection title="Classification" defaultOpen={true}>
                <CustomerClassificationCard
                  customerId={customerId}
                  type={data.customer.type ?? null}
                  volumeCapacity={data.customer.volumeCapacity ?? null}
                  featurePrograms={data.customer.featurePrograms ?? []}
                />
              </CollapsibleSection>
              <CollapsibleSection title="Delivery Preferences" defaultOpen={true}>
                <DeliveryPreferences
                  deliveryInstructions={data.customer.deliveryInstructions ?? null}
                  deliveryWindows={data.customer.deliveryWindows ?? []}
                  paymentMethod={data.customer.paymentMethod ?? null}
                  deliveryMethod={data.customer.deliveryMethod ?? null}
                  warehouseLocation={data.customer.defaultWarehouseLocation ?? null}
                />
              </CollapsibleSection>
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <>
            <QuickActions
              customerId={customerId}
              isPermanentlyClosed={data.customer.isPermanentlyClosed}
              customerName={data.customer.name}
            />

            <SampleQuickLogPanel customerId={customerId} customerName={data.customer.name} />

            <OrderHistory
              orders={data.orders}
              customerId={customerId}
              sectionId={fullHistorySectionId}
            />

            <OrderDeepDive customerId={customerId} />
          </>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopProducts topProducts={data.topProducts} />
              <ProductRecommendations recommendations={data.recommendations} />
            </div>

            <BtgPlacements placements={data.btgPlacements} />

            <SampleHistory samples={data.samples} />

            <SampleFollowUpList items={data.followUps} onComplete={handleFollowUpComplete} />

            <ProductHistoryReports customerId={customerId} />
          </>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <>
            <CustomerInsights customerId={customerId} />

            <ActivityTimeline
              activities={data.activities}
              customerId={customerId}
              customerName={data.customer.name}
            />
          </>
        )}

        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <>
            <CollapsibleSection title="Contacts" defaultOpen={true}>
              <CustomerContactsManager
                customerId={customerId}
                initialContacts={data.contacts ?? []}
                variant="sales"
              />
            </CollapsibleSection>

            <CollapsibleSection title="Google Business Profile" defaultOpen={false}>
              <GoogleProfileCard
                customer={{
                  googlePlaceName: data.customer.googlePlaceName ?? null,
                  googlePlaceId: data.customer.googlePlaceId ?? null,
                  googleFormattedAddress: data.customer.googleFormattedAddress ?? null,
                  website: data.customer.website ?? null,
                  googleMapsUrl: data.customer.googleMapsUrl ?? null,
                  googleBusinessStatus: data.customer.googleBusinessStatus ?? null,
                  googlePlaceTypes: data.customer.googlePlaceTypes ?? [],
                  phone: data.customer.phone ?? null,
                  internationalPhone: data.customer.internationalPhone ?? null,
                }}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Delivery Preferences (Detailed)" defaultOpen={false}>
              <DeliveryPreferences
                deliveryInstructions={data.customer.deliveryInstructions ?? null}
                deliveryWindows={data.customer.deliveryWindows ?? []}
                paymentMethod={data.customer.paymentMethod ?? null}
                deliveryMethod={data.customer.deliveryMethod ?? null}
                warehouseLocation={data.customer.defaultWarehouseLocation ?? null}
              />
            </CollapsibleSection>
          </>
        )}
      </div>
    </main>
  );
}
