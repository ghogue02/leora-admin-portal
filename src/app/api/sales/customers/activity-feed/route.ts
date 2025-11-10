import { NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type FeedItem = {
  id: string;
  type: "order" | "activity" | "sample" | "note";
  title: string;
  subtitle: string;
  timestamp: string;
  customerId: string;
  customerName: string;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const salesRepId = session.user.salesRep?.id ?? null;

    const [recentOrders, recentActivities, recentSamples] = await Promise.all([
      db.order.findMany({
        where: {
          tenantId,
          status: { not: "CANCELLED" },
          ...(salesRepId
            ? {
                customer: {
                  salesRepId,
                },
              }
            : {}),
        },
        orderBy: {
          orderedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          customerId: true,
          customer: {
            select: { name: true },
          },
          orderedAt: true,
          orderNumber: true,
          total: true,
        },
      }),
      db.activity.findMany({
        where: {
          tenantId,
          userId: session.user.id,
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          subject: true,
          typeCode: true,
          occurredAt: true,
          customerId: true,
          customer: {
            select: { name: true },
          },
        },
      }),
      db.activitySampleItem.findMany({
        where: {
          activity: {
            tenantId,
            userId: session.user.id,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          activityId: true,
          activity: {
            select: {
              occurredAt: true,
              customerId: true,
              customer: { select: { name: true } },
              subject: true,
            },
          },
          sku: {
            select: {
              code: true,
              product: {
                select: { name: true, brand: true },
              },
            },
          },
        },
      }),
    ]);

    const items: FeedItem[] = [];

    recentOrders.forEach((order) => {
      if (!order.customerId) return;
      items.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Order ${order.orderNumber ?? ""} delivered`,
        subtitle: `Total ${formatCurrency(order.total)} • ${order.customer?.name ?? "Customer"}`,
        timestamp: order.orderedAt?.toISOString() ?? new Date().toISOString(),
        customerId: order.customerId,
        customerName: order.customer?.name ?? "Customer",
      });
    });

    recentActivities.forEach((activity) => {
      if (!activity.customerId) return;
      items.push({
        id: `activity-${activity.id}`,
        type: "activity",
        title: activity.subject || "Customer touchpoint",
        subtitle: activity.typeCode?.replace(/_/g, " ") ?? "Activity",
        timestamp: activity.occurredAt.toISOString(),
        customerId: activity.customerId,
        customerName: activity.customer?.name ?? "Customer",
      });
    });

    recentSamples.forEach((sample) => {
      const customerId = sample.activity?.customerId;
      if (!customerId) return;
      const skuLabel = sample.sku
        ? `${sample.sku.product?.brand ?? ""} ${sample.sku.product?.name ?? ""}`.trim()
        : "Sample shared";
      items.push({
        id: `sample-${sample.id}`,
        type: "sample",
        title: skuLabel || "Sample shared",
        subtitle: sample.activity?.subject ?? "Sample follow-up",
        timestamp: sample.activity?.occurredAt?.toISOString() ?? new Date().toISOString(),
        customerId,
        customerName: sample.activity?.customer?.name ?? "Customer",
      });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      items: items.slice(0, 10),
    });
  });
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
