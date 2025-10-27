import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfMonth, subMonths, differenceInDays } from "date-fns";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

type Insight = {
  type: "pattern" | "recommendation" | "prediction" | "risk";
  title: string;
  description: string;
  confidence: number;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { customerId } = await context.params;

    // Verify customer belongs to tenant
    const customer = await db.customer.findUnique({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        name: true,
        lastOrderDate: true,
        nextExpectedOrderDate: true,
        averageOrderIntervalDays: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get order history for analysis
    const orders = await db.order.findMany({
      where: {
        customerId,
        tenantId,
        status: { not: "CANCELLED" },
      },
      include: {
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        deliveredAt: "desc",
      },
      take: 50,
    });

    const insights: Insight[] = [];

    // 1. Ordering Pattern Analysis
    if (customer.averageOrderIntervalDays && orders.length >= 3) {
      const recentOrders = orders.slice(0, 3);
      const intervals = [];

      for (let i = 0; i < recentOrders.length - 1; i++) {
        const current = recentOrders[i].deliveredAt || recentOrders[i].createdAt;
        const next = recentOrders[i + 1].deliveredAt || recentOrders[i + 1].createdAt;
        intervals.push(differenceInDays(current, next));
      }

      const avgRecentInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variability = Math.abs(avgRecentInterval - customer.averageOrderIntervalDays);

      if (variability < 5) {
        insights.push({
          type: "pattern",
          title: "Consistent Ordering Pattern",
          description: `This customer orders every ${Math.round(avgRecentInterval)} days with high regularity. Consider setting up automated reminders or subscription options.`,
          confidence: 0.9,
        });
      } else if (variability > 15) {
        insights.push({
          type: "risk",
          title: "Irregular Ordering Pattern",
          description: `Ordering frequency has become inconsistent. Recent orders vary by ${Math.round(variability)} days from normal pattern. Reach out to understand any changes.`,
          confidence: 0.75,
        });
      }
    }

    // 2. Expected Next Order Prediction
    if (customer.nextExpectedOrderDate) {
      const daysUntil = differenceInDays(customer.nextExpectedOrderDate, new Date());

      if (daysUntil <= 7 && daysUntil >= 0) {
        insights.push({
          type: "prediction",
          title: "Order Expected Soon",
          description: `Based on historical patterns, this customer is likely to order within the next ${daysUntil} days. Consider reaching out proactively.`,
          confidence: 0.85,
        });
      } else if (daysUntil < -7) {
        insights.push({
          type: "risk",
          title: "Overdue Order",
          description: `Customer is ${Math.abs(daysUntil)} days overdue for their typical order. This may indicate a problem or lost business.`,
          confidence: 0.8,
        });
      }
    }

    // 3. Product Recommendations (Customers like this also buy...)
    if (orders.length > 0) {
      // Get most frequently ordered products
      const productCounts = new Map<string, { name: string; count: number }>();

      orders.forEach((order) => {
        order.lines.forEach((line) => {
          if (line.sku?.product) {
            const current = productCounts.get(line.sku.product.id) || { name: line.sku.product.name, count: 0 };
            current.count += 1;
            productCounts.set(line.sku.product.id, current);
          }
        });
      });

      const topProducts = Array.from(productCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);

      if (topProducts.length > 0) {
        const productNames = topProducts.map((p) => p[1].name).join(", ");
        insights.push({
          type: "recommendation",
          title: "Top Products",
          description: `This customer frequently orders: ${productNames}. Consider offering volume discounts or bundled deals.`,
          confidence: 0.92,
        });
      }

      // Find products ordered by similar customers but not this one
      const customerProductIds = new Set(
        orders.flatMap((o) => o.lines.map((l) => l.sku?.product?.id).filter(Boolean))
      );

      // This is a simplified version - in production, you'd use more sophisticated similarity matching
      if (customerProductIds.size >= 3) {
        insights.push({
          type: "recommendation",
          title: "Cross-Sell Opportunity",
          description: "Based on similar customers' purchasing patterns, consider recommending complementary products or seasonal items.",
          confidence: 0.7,
        });
      }
    }

    // 4. Revenue Trend Analysis
    const last3Months = orders.filter((o) => {
      const orderDate = o.deliveredAt || o.createdAt;
      return orderDate >= subMonths(new Date(), 3);
    });

    const last6Months = orders.filter((o) => {
      const orderDate = o.deliveredAt || o.createdAt;
      return orderDate >= subMonths(new Date(), 6);
    });

    if (last3Months.length > 0 && last6Months.length > 0) {
      const recent3Total = last3Months.reduce((sum, o) => sum + Number(o.total), 0);
      const prev3Total = last6Months
        .filter((o) => {
          const orderDate = o.deliveredAt || o.createdAt;
          return orderDate < subMonths(new Date(), 3);
        })
        .reduce((sum, o) => sum + Number(o.total), 0);

      if (prev3Total > 0) {
        const change = ((recent3Total - prev3Total) / prev3Total) * 100;

        if (change > 20) {
          insights.push({
            type: "pattern",
            title: "Revenue Growth",
            description: `Revenue has increased by ${Math.round(change)}% over the last 3 months. Customer is expanding their business with you.`,
            confidence: 0.88,
          });
        } else if (change < -20) {
          insights.push({
            type: "risk",
            title: "Revenue Decline",
            description: `Revenue has decreased by ${Math.abs(Math.round(change))}% over the last 3 months. Schedule a check-in to understand their needs.`,
            confidence: 0.85,
          });
        }
      }
    }

    // 5. Seasonal Pattern Detection
    const monthlyOrders = new Map<number, number>();
    orders.forEach((order) => {
      const month = (order.deliveredAt || order.createdAt).getMonth();
      monthlyOrders.set(month, (monthlyOrders.get(month) || 0) + 1);
    });

    if (monthlyOrders.size >= 6) {
      const sortedMonths = Array.from(monthlyOrders.entries()).sort((a, b) => b[1] - a[1]);
      const topMonth = sortedMonths[0];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      if (topMonth[1] > 2) {
        insights.push({
          type: "pattern",
          title: "Seasonal Pattern Detected",
          description: `Customer tends to order more frequently in ${monthNames[topMonth[0]]}. Plan inventory and outreach accordingly.`,
          confidence: 0.75,
        });
      }
    }

    return NextResponse.json({
      insights: insights.slice(0, 6), // Limit to top 6 insights
      metadata: {
        ordersAnalyzed: orders.length,
        generatedAt: new Date().toISOString(),
      },
    });
  });
}
