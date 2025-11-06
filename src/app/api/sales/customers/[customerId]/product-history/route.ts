import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths, eachMonthOfInterval, format } from "date-fns";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { customerId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "breakdown";

    // Verify customer belongs to tenant
    const customer = await db.customer.findUnique({
      where: { id: customerId, tenantId },
      select: { id: true, name: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (type === "breakdown") {
      // Get product breakdown: what products, when last ordered, frequency, revenue
      const orderLines = await db.orderLine.findMany({
        where: {
          order: {
            customerId,
            tenantId,
            status: { not: "CANCELLED" },
          },
        },
        include: {
          sku: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
            },
          },
          order: {
            select: {
              deliveredAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          order: {
            deliveredAt: "desc",
          },
        },
      });

      // Group by product
      const productMap = new Map<
        string,
        {
          productId: string;
          productName: string;
          orders: { date: Date; revenue: number }[];
          totalRevenue: number;
          totalOrders: number;
        }
      >();

      for (const line of orderLines) {
        const productId = line.sku?.product?.id || "unknown";
        const productName = line.sku?.product?.name || "Unknown Product";
        const orderDate = line.order.deliveredAt || line.order.createdAt;
        const revenue = Number(line.quantity) * Number(line.unitPrice);

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            orders: [],
            totalRevenue: 0,
            totalOrders: 0,
          });
        }

        const product = productMap.get(productId)!;
        product.orders.push({ date: orderDate, revenue });
        product.totalRevenue += revenue;
      }

      // Calculate metrics for each product
      const products = Array.from(productMap.values()).map((p) => {
        // Sort orders by date
        p.orders.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Get unique order dates (multiple lines can be in same order)
        const uniqueOrderDates = Array.from(
          new Set(p.orders.map((o) => o.date.toISOString()))
        ).map((d) => new Date(d));

        const totalOrders = uniqueOrderDates.length;
        const lastOrderDate = uniqueOrderDates[0];

        // Calculate average frequency between orders
        let totalDaysBetweenOrders = 0;
        for (let i = 1; i < uniqueOrderDates.length; i++) {
          const diff = uniqueOrderDates[i - 1].getTime() - uniqueOrderDates[i].getTime();
          totalDaysBetweenOrders += diff / (1000 * 60 * 60 * 24);
        }
        const averageFrequencyDays =
          uniqueOrderDates.length > 1 ? totalDaysBetweenOrders / (uniqueOrderDates.length - 1) : 0;

        // Calculate orders per month
        const oldestOrder = uniqueOrderDates[uniqueOrderDates.length - 1];
        const monthsSpan = Math.max(
          1,
          (new Date().getTime() - oldestOrder.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const ordersPerMonth = totalOrders / monthsSpan;

        return {
          productId: p.productId,
          productName: p.productName,
          lastOrderDate: lastOrderDate.toISOString(),
          totalOrders,
          totalRevenue: p.totalRevenue,
          averageFrequencyDays,
          ordersPerMonth,
        };
      });

      // Sort by total revenue descending
      products.sort((a, b) => b.totalRevenue - a.totalRevenue);

      return NextResponse.json({ products });
    }

    if (type === "timeline") {
      // Get product purchase timeline for charts
      const now = new Date();
      const startDate = subMonths(now, 12); // Last 12 months

      const orderLines = await db.orderLine.findMany({
        where: {
          order: {
            customerId,
            tenantId,
            status: { not: "CANCELLED" },
            OR: [
              { deliveredAt: { gte: startDate } },
              { createdAt: { gte: startDate } },
            ],
          },
        },
        include: {
          sku: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          order: {
            select: {
              deliveredAt: true,
              createdAt: true,
            },
          },
        },
      });

      // Generate month buckets
      const months = eachMonthOfInterval({ start: startDate, end: now });
      const monthLabels = months.map((m) => format(m, "MMM yyyy"));

      // Group by product and month
      const productTimeline = new Map<string, { name: string; data: number[] }>();

      for (const line of orderLines) {
        const productId = line.sku?.product?.id || "unknown";
        const productName = line.sku?.product?.name || "Unknown Product";
        const orderDate = line.order.deliveredAt || line.order.createdAt;
        const monthIndex = months.findIndex(
          (m) =>
            orderDate >= m &&
            orderDate < new Date(m.getFullYear(), m.getMonth() + 1, 1)
        );

        if (monthIndex === -1) continue;

        if (!productTimeline.has(productId)) {
          productTimeline.set(productId, {
            name: productName,
            data: new Array(months.length).fill(0),
          });
        }

        const product = productTimeline.get(productId)!;
        product.data[monthIndex] += Number(line.quantity) * Number(line.unitPrice);
      }

      return NextResponse.json({
        months: monthLabels,
        products: Array.from(productTimeline.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          data: data.data,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  });
}
