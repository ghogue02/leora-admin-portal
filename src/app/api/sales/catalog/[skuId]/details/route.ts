import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: { skuId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const { skuId } = params;

      // Get SKU with product details
      const sku = await db.sku.findFirst({
        where: {
          id: skuId,
          tenantId,
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true,
              description: true,
              tastingNotes: true,
              foodPairings: true,
              servingInfo: true,
              wineDetails: true,
              enrichedAt: true,
              enrichedBy: true,
            },
          },
        },
      });

      if (!sku) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      const sixMonthsAgo = subMonths(new Date(), 6);

      // Run all queries in parallel
      const [
        inventoryData,
        priceListData,
        orderLinesData,
        topCustomersData,
        monthlyTrendData,
      ] = await Promise.all([
        // Inventory by location
        db.inventory.findMany({
          where: {
            tenantId,
            skuId,
          },
          select: {
            location: true,
            onHand: true,
            allocated: true,
          },
        }),

        // Price lists
        db.priceListItem.findMany({
          where: {
            tenantId,
            skuId,
          },
          include: {
            priceList: {
              select: {
                name: true,
                currency: true,
                effectiveAt: true,
                expiresAt: true,
              },
            },
          },
          orderBy: {
            price: 'asc',
          },
        }),

        // Order lines for this SKU
        db.orderLine.findMany({
          where: {
            tenantId,
            skuId,
            order: {
              status: { not: 'CANCELLED' },
            },
          },
          select: {
            quantity: true,
            unitPrice: true,
            order: {
              select: {
                customerId: true,
                orderedAt: true,
              },
            },
          },
        }),

        // Top customers for this product
        db.orderLine.groupBy({
          by: ['order'],
          where: {
            tenantId,
            skuId,
            order: {
              status: { not: 'CANCELLED' },
            },
          },
          _sum: {
            quantity: true,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _sum: {
              quantity: 'desc',
            },
          },
          take: 10,
        }),

        // Monthly trend
        db.$queryRaw<
          Array<{ month: string; total_units: bigint; total_revenue: number; order_count: bigint }>
        >`
          SELECT
            TO_CHAR(DATE_TRUNC('month', o."orderedAt"), 'YYYY-MM') as month,
            SUM(ol.quantity) as total_units,
            SUM(ol.quantity * ol."unitPrice") as total_revenue,
            COUNT(DISTINCT o.id) as order_count
          FROM "OrderLine" ol
          JOIN "Order" o ON ol."orderId" = o.id
          WHERE ol."skuId" = ${skuId}::uuid
            AND ol."tenantId" = ${tenantId}::uuid
            AND o.status != 'CANCELLED'
            AND o."orderedAt" >= ${sixMonthsAgo}
          GROUP BY DATE_TRUNC('month', o."orderedAt")
          ORDER BY month DESC
        `,
      ]);

      // Calculate inventory totals
      const totalOnHand = inventoryData.reduce((sum, inv) => sum + inv.onHand, 0);
      const totalAllocated = inventoryData.reduce((sum, inv) => sum + inv.allocated, 0);
      const totalAvailable = totalOnHand - totalAllocated;

      // Get customer names for top customers
      const customerIds = orderLinesData.map((line) => line.order.customerId);
      const uniqueCustomerIds = Array.from(new Set(customerIds));
      const customers = await db.customer.findMany({
        where: {
          id: { in: uniqueCustomerIds },
        },
        select: {
          id: true,
          name: true,
        },
      });
      const customerMap = new Map(customers.map((c) => [c.id, c.name]));

      // Calculate top customers
      const customerStats = new Map<string, { units: number; revenue: number; orders: number }>();
      orderLinesData.forEach((line) => {
        const customerId = line.order.customerId;
        const existing = customerStats.get(customerId) || { units: 0, revenue: 0, orders: 0 };
        existing.units += line.quantity;
        existing.revenue += line.quantity * Number(line.unitPrice);
        existing.orders += 1;
        customerStats.set(customerId, existing);
      });

      const topCustomers = Array.from(customerStats.entries())
        .map(([customerId, stats]) => ({
          customerId,
          customerName: customerMap.get(customerId) ?? 'Unknown',
          totalUnits: stats.units,
          totalRevenue: stats.revenue,
          orderCount: stats.orders,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      // Calculate sales totals
      const totalOrders = new Set(orderLinesData.map((line) => line.order)).size;
      const totalUnits = orderLinesData.reduce((sum, line) => sum + line.quantity, 0);
      const totalRevenue = orderLinesData.reduce(
        (sum, line) => sum + line.quantity * Number(line.unitPrice),
        0
      );
      const avgOrderSize = totalOrders > 0 ? totalUnits / totalOrders : 0;

      // Format monthly trend
      const monthlyTrend = monthlyTrendData.map((m) => ({
        month: m.month,
        units: Number(m.total_units),
        revenue: Number(m.total_revenue),
        orders: Number(m.order_count),
      }));

      // Generate insights
      const insights: string[] = [];

      if (totalOrders > 0) {
        insights.push(`Sold ${totalUnits} units across ${totalOrders} orders`);
      }

      if (topCustomers.length > 0) {
        insights.push(
          `Top customer: ${topCustomers[0].customerName} with ${topCustomers[0].totalUnits} units ordered`
        );
      }

      if (totalAvailable > 0) {
        insights.push(`${totalAvailable} units available to sell now`);
      } else {
        insights.push('⚠️ Out of stock - consider reordering');
      }

      if (monthlyTrend.length > 1) {
        const recentMonth = monthlyTrend[0];
        const previousMonth = monthlyTrend[1];
        if (recentMonth && previousMonth) {
          const change = ((recentMonth.units - previousMonth.units) / previousMonth.units) * 100;
          if (change > 10) {
            insights.push(`📈 Sales up ${change.toFixed(0)}% vs last month`);
          } else if (change < -10) {
            insights.push(`📉 Sales down ${Math.abs(change).toFixed(0)}% vs last month`);
          }
        }
      }

      if (priceListData.length > 1) {
        insights.push(`Available on ${priceListData.length} different price lists`);
      }

      if (inventoryData.length > 1) {
        insights.push(`Stocked in ${inventoryData.length} locations`);
      }

      const details = {
        product: {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          size: sku.size,
          unitOfMeasure: sku.unitOfMeasure,
          abv: sku.abv,
          description: sku.product.description ?? null,
          tastingNotes: sku.product.tastingNotes ?? null,
          foodPairings: sku.product.foodPairings ?? null,
          servingInfo: sku.product.servingInfo ?? null,
          wineDetails: sku.product.wineDetails ?? null,
          enrichedAt: sku.product.enrichedAt?.toISOString() ?? null,
          enrichedBy: sku.product.enrichedBy ?? null,
        },
        inventory: {
          totalOnHand,
          totalAvailable,
          byLocation: inventoryData.map((inv) => ({
            location: inv.location,
            onHand: inv.onHand,
            allocated: inv.allocated,
            available: inv.onHand - inv.allocated,
          })),
        },
        pricing: {
          priceLists: priceListData.map((item) => ({
            priceListName: item.priceList.name,
            price: Number(item.price),
            currency: item.priceList.currency,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
            effectiveAt: item.priceList.effectiveAt?.toISOString() ?? null,
            expiresAt: item.priceList.expiresAt?.toISOString() ?? null,
          })),
        },
        sales: {
          totalOrders,
          totalUnits,
          totalRevenue,
          avgOrderSize,
          topCustomers,
          monthlyTrend,
        },
        insights,
      };

      return NextResponse.json(details);
    }
  );
}
