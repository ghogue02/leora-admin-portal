import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths, startOfWeek, endOfWeek } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const searchParams = request.nextUrl.searchParams;
      const type = searchParams.get('type');

      if (!type) {
        return NextResponse.json(
          { error: 'type parameter is required' },
          { status: 400 }
        );
      }

      // Get sales rep profile for filtering
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      const salesRepFilter = salesRep ? { salesRepId: salesRep.id } : {};

      let drilldownData;

      switch (type) {
        case 'top-customers':
          drilldownData = await getTopCustomersDrilldown(db, tenantId, salesRepFilter);
          break;
        case 'top-products':
          drilldownData = await getTopProductsDrilldown(db, tenantId, salesRepFilter);
          break;
        case 'customer-risk':
          drilldownData = await getCustomerRiskDrilldown(db, tenantId, salesRepFilter);
          break;
        case 'monthly-trend':
          drilldownData = await getMonthlyTrendDrilldown(db, tenantId, salesRepFilter);
          break;
        case 'samples':
          drilldownData = await getSamplesDrilldown(db, tenantId, salesRep);
          break;
        case 'order-status':
          drilldownData = await getOrderStatusDrilldown(db, tenantId, salesRepFilter);
          break;
        case 'recent-activity':
          drilldownData = await getRecentActivityDrilldown(db, tenantId, session.user.id, salesRep);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid drilldown type' },
            { status: 400 }
          );
      }

      return NextResponse.json(drilldownData);
    }
  );
}

async function getTopCustomersDrilldown(db: any, tenantId: string, salesRepFilter: any) {
  // Get all customers with their order metrics
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      ...salesRepFilter,
      isPermanentlyClosed: false,
    },
    include: {
      orders: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          total: true,
          orderedAt: true,
          status: true,
        },
      },
      salesRep: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
  });

  const customersWithMetrics = customers.map((customer) => {
    const totalRevenue = customer.orders.reduce(
      (sum: number, order: any) => sum + Number(order.total ?? 0),
      0
    );
    const orderCount = customer.orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const lastOrderDate = customer.orders.length > 0
      ? new Date(Math.max(...customer.orders.map((o: any) => new Date(o.orderedAt).getTime())))
      : null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      customerId: customer.id,
      name: customer.name,
      state: customer.state,
      riskStatus: customer.riskStatus,
      totalRevenue,
      orderCount,
      avgOrderValue,
      lastOrderDate: lastOrderDate?.toISOString(),
      daysSinceLastOrder,
      salesRep: customer.salesRep?.user.fullName ?? 'Unassigned',
      paymentTerms: customer.paymentTerms,
    };
  });

  // Sort by revenue descending
  customersWithMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totalRevenue = customersWithMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalOrders = customersWithMetrics.reduce((sum, c) => sum + c.orderCount, 0);

  return {
    title: 'Top Customers - Detailed Analysis',
    description: `Complete breakdown of all ${customersWithMetrics.length} customers sorted by revenue`,
    data: {
      summary: {
        totalCustomers: customersWithMetrics.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        avgRevenuePerCustomer: (totalRevenue / customersWithMetrics.length).toFixed(2),
      },
      items: customersWithMetrics,
      chartData: {
        type: 'bar',
        data: customersWithMetrics.slice(0, 10).map((c) => ({
          label: c.name.slice(0, 20),
          value: c.totalRevenue,
        })),
      },
      insights: [
        `Top customer generates ${((customersWithMetrics[0]?.totalRevenue / totalRevenue) * 100).toFixed(1)}% of total revenue`,
        `Top 10 customers represent ${((customersWithMetrics.slice(0, 10).reduce((s, c) => s + c.totalRevenue, 0) / totalRevenue) * 100).toFixed(1)}% of revenue`,
        `Average customer lifetime value: $${(totalRevenue / customersWithMetrics.length).toFixed(0)}`,
        `${customersWithMetrics.filter((c) => c.riskStatus !== 'HEALTHY').length} customers need attention`,
      ],
    },
    columns: [
      { key: 'name', label: 'Customer Name' },
      { key: 'state', label: 'State' },
      { key: 'totalRevenue', label: 'Revenue', format: (v: number) => `$${v.toFixed(2)}` },
      { key: 'orderCount', label: 'Orders' },
      { key: 'avgOrderValue', label: 'Avg Order', format: (v: number) => `$${v.toFixed(2)}` },
      { key: 'daysSinceLastOrder', label: 'Days Since Last', format: (v: number | null) => v ?? 'Never' },
      { key: 'riskStatus', label: 'Status' },
      { key: 'salesRep', label: 'Sales Rep' },
    ],
  };
}

async function getTopProductsDrilldown(db: any, tenantId: string, salesRepFilter: any) {
  const orderLines = await db.orderLine.findMany({
    where: {
      tenantId,
      order: {
        customer: salesRepFilter,
        status: { not: 'CANCELLED' },
      },
    },
    include: {
      sku: {
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true,
            },
          },
        },
      },
      order: {
        select: {
          total: true,
          orderedAt: true,
        },
      },
    },
  });

  // Group by SKU
  const productMap = new Map();
  orderLines.forEach((line: any) => {
    const skuId = line.skuId;
    if (!productMap.has(skuId)) {
      productMap.set(skuId, {
        skuId,
        productName: line.sku.product.name,
        brand: line.sku.product.brand,
        category: line.sku.product.category,
        size: line.sku.size ? Math.round(Number(line.sku.size)) : null,
        unitsSold: 0,
        orderCount: 0,
        revenue: 0,
        avgUnitPrice: 0,
      });
    }
    const product = productMap.get(skuId);
    product.unitsSold += line.quantity;
    product.orderCount += 1;
    product.revenue += Number(line.unitPrice) * line.quantity;
    product.avgUnitPrice = product.revenue / product.unitsSold;
  });

  const products = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const totalUnits = products.reduce((sum, p) => sum + p.unitsSold, 0);

  return {
    title: 'Product Performance - Detailed Analysis',
    description: `All ${products.length} products ranked by revenue contribution`,
    data: {
      summary: {
        totalProducts: products.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalUnits,
        avgRevenuePerProduct: (totalRevenue / products.length).toFixed(2),
      },
      items: products,
      chartData: {
        type: 'bar',
        data: products.slice(0, 10).map((p) => ({
          label: p.productName.slice(0, 20),
          value: p.revenue,
        })),
      },
      insights: [
        `Top product accounts for ${((products[0]?.revenue / totalRevenue) * 100).toFixed(1)}% of product revenue`,
        `Average units per order: ${(totalUnits / products.reduce((s, p) => s + p.orderCount, 0)).toFixed(1)}`,
        `${products.filter((p) => p.category).length} categorized products`,
        `Top 10 products generate ${((products.slice(0, 10).reduce((s, p) => s + p.revenue, 0) / totalRevenue) * 100).toFixed(1)}% of revenue`,
      ],
    },
    columns: [
      { key: 'productName', label: 'Product' },
      { key: 'brand', label: 'Brand' },
      { key: 'category', label: 'Category' },
      { key: 'size', label: 'Size' },
      { key: 'unitsSold', label: 'Units Sold' },
      { key: 'orderCount', label: 'Orders' },
      { key: 'revenue', label: 'Revenue', format: (v: number) => `$${v.toFixed(2)}` },
      { key: 'avgUnitPrice', label: 'Avg Price', format: (v: number) => `$${v.toFixed(2)}` },
    ],
  };
}

async function getCustomerRiskDrilldown(db: any, tenantId: string, salesRepFilter: any) {
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      ...salesRepFilter,
      isPermanentlyClosed: false,
    },
    select: {
      id: true,
      name: true,
      state: true,
      riskStatus: true,
      lastOrderDate: true,
      nextExpectedOrderDate: true,
      averageOrderIntervalDays: true,
      establishedRevenue: true,
      salesRep: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
  });

  const now = new Date();
  const customersWithDetails = customers.map((customer) => {
    const daysSinceLastOrder = customer.lastOrderDate
      ? Math.floor((now.getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysUntilExpected = customer.nextExpectedOrderDate
      ? Math.floor((new Date(customer.nextExpectedOrderDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      customerId: customer.id,
      name: customer.name,
      state: customer.state,
      riskStatus: customer.riskStatus,
      daysSinceLastOrder,
      daysUntilExpected,
      averagePace: customer.averageOrderIntervalDays,
      establishedRevenue: Number(customer.establishedRevenue ?? 0),
      salesRep: customer.salesRep?.user.fullName ?? 'Unassigned',
    };
  });

  const riskCounts = customersWithDetails.reduce(
    (acc, c) => {
      acc[c.riskStatus] = (acc[c.riskStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    title: 'Customer Risk Analysis',
    description: 'Detailed breakdown of customer health and risk factors',
    data: {
      summary: {
        totalCustomers: customersWithDetails.length,
        healthy: riskCounts.HEALTHY || 0,
        atRiskCadence: riskCounts.AT_RISK_CADENCE || 0,
        atRiskRevenue: riskCounts.AT_RISK_REVENUE || 0,
        dormant: riskCounts.DORMANT || 0,
      },
      items: customersWithDetails.filter((c) => c.riskStatus !== 'HEALTHY'),
      chartData: {
        type: 'pie',
        data: Object.entries(riskCounts).map(([label, value]) => ({
          label,
          value,
        })),
      },
      insights: [
        `${((riskCounts.HEALTHY || 0) / customersWithDetails.length * 100).toFixed(1)}% of customers are healthy`,
        `${riskCounts.AT_RISK_CADENCE || 0} customers need follow-up for cadence`,
        `${riskCounts.DORMANT || 0} dormant customers present reactivation opportunity`,
        `Average days since last order for at-risk: ${customersWithDetails.filter((c) => c.riskStatus !== 'HEALTHY').reduce((sum, c) => sum + (c.daysSinceLastOrder ?? 0), 0) / (customersWithDetails.filter((c) => c.riskStatus !== 'HEALTHY').length || 1).toFixed(0)}`,
      ],
    },
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'state', label: 'State' },
      { key: 'riskStatus', label: 'Risk Status' },
      { key: 'daysSinceLastOrder', label: 'Days Since Last', format: (v: number | null) => v ?? 'Never' },
      { key: 'daysUntilExpected', label: 'Days Until Expected', format: (v: number | null) => v ?? 'N/A' },
      { key: 'averagePace', label: 'Avg Pace (days)' },
      { key: 'establishedRevenue', label: 'Est. Revenue', format: (v: number) => `$${v.toFixed(0)}` },
      { key: 'salesRep', label: 'Sales Rep' },
    ],
  };
}

async function getMonthlyTrendDrilldown(db: any, tenantId: string, salesRepFilter: any) {
  const twelveMonthsAgo = subMonths(new Date(), 12);

  const monthlyData = await db.$queryRaw<
    Array<{
      month: string;
      order_count: bigint;
      total_revenue: number;
      unique_customers: bigint;
      avg_order_value: number;
    }>
  >`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "orderedAt"), 'YYYY-MM') as month,
      COUNT(*) as order_count,
      COALESCE(SUM(total), 0) as total_revenue,
      COUNT(DISTINCT "customerId") as unique_customers,
      COALESCE(AVG(total), 0) as avg_order_value
    FROM "Order"
    WHERE "orderedAt" >= ${twelveMonthsAgo}
      AND "tenantId" = ${tenantId}::uuid
      AND status != 'CANCELLED'
    GROUP BY DATE_TRUNC('month', "orderedAt")
    ORDER BY month DESC
  `;

  const items = monthlyData.map((m) => ({
    month: m.month,
    orders: Number(m.order_count),
    revenue: Number(m.total_revenue),
    customers: Number(m.unique_customers),
    avgOrderValue: Number(m.avg_order_value),
  }));

  const totalRevenue = items.reduce((sum, m) => sum + m.revenue, 0);
  const totalOrders = items.reduce((sum, m) => sum + m.orders, 0);

  return {
    title: 'Monthly Trend Analysis (12 Months)',
    description: 'Month-over-month performance metrics and trends',
    data: {
      summary: {
        totalMonths: items.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        avgMonthlyRevenue: (totalRevenue / items.length).toFixed(2),
      },
      items,
      chartData: {
        type: 'line',
        data: items.reverse().map((m) => ({
          label: m.month,
          value: m.revenue,
        })),
      },
      insights: [
        `Best month: ${items.reduce((best, m) => m.revenue > best.revenue ? m : best).month} with $${items.reduce((best, m) => m.revenue > best.revenue ? m : best).revenue.toFixed(0)}`,
        `Average monthly orders: ${(totalOrders / items.length).toFixed(0)}`,
        `Growth trend: ${items[0].revenue > items[items.length - 1].revenue ? 'Positive' : 'Negative'}`,
        `Average order value across period: $${(totalRevenue / totalOrders).toFixed(2)}`,
      ],
    },
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'orders', label: 'Orders' },
      { key: 'revenue', label: 'Revenue', format: (v: number) => `$${v.toLocaleString()}` },
      { key: 'customers', label: 'Customers' },
      { key: 'avgOrderValue', label: 'Avg Order', format: (v: number) => `$${v.toFixed(2)}` },
    ],
  };
}

async function getSamplesDrilldown(db: any, tenantId: string, salesRep: any) {
  const samples = await db.sampleUsage.findMany({
    where: {
      tenantId,
      ...(salesRep ? { salesRepId: salesRep.id } : {}),
    },
    include: {
      customer: { select: { name: true } },
      sku: {
        include: {
          product: { select: { name: true, brand: true } },
        },
      },
      salesRep: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
    orderBy: { tastedAt: 'desc' },
  });

  const items = samples.map((s) => ({
    id: s.id,
    customer: s.customer.name,
    product: s.sku.product.name,
    brand: s.sku.product.brand,
    quantity: s.quantity,
    tastedAt: s.tastedAt.toISOString().split('T')[0],
    resultedInOrder: s.resultedInOrder,
    needsFollowUp: s.needsFollowUp,
    feedback: s.feedback,
    salesRep: s.salesRep.user.fullName,
  }));

  const converted = samples.filter((s) => s.resultedInOrder).length;
  const conversionRate = samples.length > 0 ? (converted / samples.length) * 100 : 0;

  return {
    title: 'Sample Usage - Detailed Tracking',
    description: 'Complete history of samples given and their conversion outcomes',
    data: {
      summary: {
        totalSamples: samples.reduce((sum, s) => sum + s.quantity, 0),
        sampleEvents: samples.length,
        converted,
        conversionRate: conversionRate.toFixed(1) + '%',
      },
      items,
      chartData: {
        type: 'pie',
        data: [
          { label: 'Converted', value: converted },
          { label: 'Not Converted', value: samples.length - converted },
        ],
      },
      insights: [
        `Conversion rate: ${conversionRate.toFixed(1)}%`,
        `${samples.filter((s) => s.needsFollowUp).length} samples need follow-up`,
        `Most sampled: ${items[0]?.product ?? 'N/A'}`,
        `Average samples per event: ${samples.length > 0 ? (samples.reduce((sum, s) => sum + s.quantity, 0) / samples.length).toFixed(1) : 0}`,
      ],
    },
    columns: [
      { key: 'customer', label: 'Customer' },
      { key: 'product', label: 'Product' },
      { key: 'brand', label: 'Brand' },
      { key: 'quantity', label: 'Qty' },
      { key: 'tastedAt', label: 'Date' },
      { key: 'resultedInOrder', label: 'Converted', format: (v: boolean) => v ? '✓' : '✗' },
      { key: 'needsFollowUp', label: 'Follow-up', format: (v: boolean) => v ? 'Yes' : 'No' },
      { key: 'salesRep', label: 'Rep' },
    ],
  };
}

async function getOrderStatusDrilldown(db: any, tenantId: string, salesRepFilter: any) {
  const orders = await db.order.findMany({
    where: {
      tenantId,
      customer: salesRepFilter,
    },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { orderedAt: 'desc' },
    take: 200,
  });

  const items = orders.map((o) => ({
    orderId: o.id.slice(0, 8),
    customer: o.customer.name,
    status: o.status,
    orderedAt: o.orderedAt?.toISOString().split('T')[0] ?? 'N/A',
    total: Number(o.total ?? 0),
  }));

  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    title: 'Order Status Distribution',
    description: 'Recent orders grouped by status',
    data: {
      summary: statusCounts,
      items,
      chartData: {
        type: 'pie',
        data: Object.entries(statusCounts).map(([label, value]) => ({
          label,
          value,
        })),
      },
      insights: [
        `Most orders are ${Object.entries(statusCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]}`,
        `Total value of recent orders: $${orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0).toFixed(2)}`,
      ],
    },
    columns: [
      { key: 'orderId', label: 'Order ID' },
      { key: 'customer', label: 'Customer' },
      { key: 'status', label: 'Status' },
      { key: 'orderedAt', label: 'Date' },
      { key: 'total', label: 'Total', format: (v: number) => `$${v.toFixed(2)}` },
    ],
  };
}

async function getRecentActivityDrilldown(db: any, tenantId: string, userId: string, salesRep: any) {
  const thirtyDaysAgo = subMonths(new Date(), 1);

  const activities = await db.activity.findMany({
    where: {
      tenantId,
      occurredAt: { gte: thirtyDaysAgo },
      ...(salesRep ? { userId } : {}),
    },
    include: {
      activityType: true,
      customer: { select: { name: true } },
      user: { select: { fullName: true } },
    },
    orderBy: { occurredAt: 'desc' },
  });

  const items = activities.map((a) => ({
    id: a.id.slice(0, 8),
    type: a.activityType.name,
    customer: a.customer?.name ?? 'N/A',
    subject: a.subject,
    occurredAt: a.occurredAt.toISOString().split('T')[0],
    outcome: a.outcome,
    user: a.user?.fullName ?? 'System',
  }));

  const typeCounts = activities.reduce(
    (acc, a) => {
      const type = a.activityType.name;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    title: 'Recent Activity Log (30 Days)',
    description: 'All sales activities in the last 30 days',
    data: {
      summary: {
        totalActivities: activities.length,
        ...typeCounts,
      },
      items,
      chartData: {
        type: 'bar',
        data: Object.entries(typeCounts).map(([label, value]) => ({
          label,
          value,
        })),
      },
      insights: [
        `Most common activity: ${Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]}`,
        `${activities.filter((a) => a.outcome === 'SUCCESS').length} successful activities`,
        `${activities.filter((a) => a.followUpAt).length} activities with follow-ups scheduled`,
      ],
    },
    columns: [
      { key: 'type', label: 'Activity Type' },
      { key: 'customer', label: 'Customer' },
      { key: 'subject', label: 'Subject' },
      { key: 'occurredAt', label: 'Date' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'user', label: 'Rep' },
    ],
  };
}
