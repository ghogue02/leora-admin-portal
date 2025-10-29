import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile for the logged-in user
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      const now = new Date();

      // Get all delivered orders with details
      const allOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            not: null,
          },
          status: {
            not: "CANCELLED",
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              city: true,
              state: true,
            },
          },
          lines: {
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
            },
          },
        },
        orderBy: {
          deliveredAt: "desc",
        },
      });

      // Group revenue by year
      const yearlyRevenue = allOrders.reduce((acc, order) => {
        if (!order.deliveredAt) return acc;

        const year = format(order.deliveredAt, "yyyy");
        if (!acc[year]) {
          acc[year] = {
            year,
            revenue: 0,
            orderCount: 0,
            uniqueCustomers: new Set(),
          };
        }

        acc[year].revenue += Number(order.total || 0);
        acc[year].orderCount += 1;
        acc[year].uniqueCustomers.add(order.customerId);

        return acc;
      }, {} as Record<string, any>);

      const yearlyRevenueArray = Object.values(yearlyRevenue)
        .map((item: any) => ({
          year: item.year,
          revenue: item.revenue,
          orderCount: item.orderCount,
          uniqueCustomers: item.uniqueCustomers.size,
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

      // Calculate revenue by customer (lifetime)
      const customerRevenue = allOrders.reduce((acc, order) => {
        const customerId = order.customer.id;
        if (!acc[customerId]) {
          acc[customerId] = {
            customer: order.customer,
            revenue: 0,
            orderCount: 0,
            firstOrderDate: order.deliveredAt,
            lastOrderDate: order.deliveredAt,
            orders: [],
          };
        }
        acc[customerId].revenue += Number(order.total || 0);
        acc[customerId].orderCount += 1;

        if (order.deliveredAt && order.deliveredAt < acc[customerId].firstOrderDate) {
          acc[customerId].firstOrderDate = order.deliveredAt;
        }
        if (order.deliveredAt && order.deliveredAt > acc[customerId].lastOrderDate) {
          acc[customerId].lastOrderDate = order.deliveredAt;
        }

        acc[customerId].orders.push({
          id: order.id,
          total: Number(order.total || 0),
          deliveredAt: order.deliveredAt?.toISOString() || null,
          status: order.status,
        });
        return acc;
      }, {} as Record<string, any>);

      const topCustomers = Object.values(customerRevenue)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((item: any) => ({
          customerId: item.customer.id,
          customerName: item.customer.name,
          accountNumber: item.customer.accountNumber,
          location: [item.customer.city, item.customer.state].filter(Boolean).join(", ") || "N/A",
          revenue: item.revenue,
          orderCount: item.orderCount,
          averageOrderValue: item.orderCount > 0 ? item.revenue / item.orderCount : 0,
          firstOrderDate: item.firstOrderDate?.toISOString() || null,
          lastOrderDate: item.lastOrderDate?.toISOString() || null,
          recentOrders: item.orders
            .sort(
              (a: { deliveredAt: string | null }, b: { deliveredAt: string | null }) =>
                (b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0) -
                (a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0)
            )
            .slice(0, 3)
            .map((order: { id: string; total: number; deliveredAt: string | null }) => ({
              id: order.id,
              deliveredAt: order.deliveredAt,
              total: order.total,
            })),
        }));

      // Calculate revenue by category/brand (lifetime)
      const categoryRevenue = allOrders.reduce((acc, order) => {
        order.lines.forEach((line) => {
          const category = line.sku.product.category || "Uncategorized";
          const brand = line.sku.product.brand || "Unknown Brand";
          const lineTotal = Number(line.unitPrice) * line.quantity;

          if (!acc.byCategory[category]) {
            acc.byCategory[category] = 0;
          }
          if (!acc.byBrand[brand]) {
            acc.byBrand[brand] = 0;
          }

          acc.byCategory[category] += lineTotal;
          acc.byBrand[brand] += lineTotal;
        });
        return acc;
      }, { byCategory: {} as Record<string, number>, byBrand: {} as Record<string, number> });

      // Get top products sold (lifetime)
      const productSales = allOrders.reduce((acc, order) => {
        order.lines.forEach((line) => {
          const productName = line.sku.product.name;
          const skuCode = line.sku.code;
          const key = `${productName}-${skuCode}`;

          if (!acc[key]) {
            acc[key] = {
              productName,
              brand: line.sku.product.brand,
              category: line.sku.product.category,
              skuCode,
              quantity: 0,
              revenue: 0,
              orderCount: 0,
            };
          }

          acc[key].quantity += line.quantity;
          acc[key].revenue += Number(line.unitPrice) * line.quantity;
          acc[key].orderCount += 1;
        });
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate totals
      const totalRevenue = allOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      // Find first order date
      const firstOrder = allOrders.length > 0
        ? allOrders.reduce((earliest, order) =>
            order.deliveredAt && (!earliest.deliveredAt || order.deliveredAt < earliest.deliveredAt)
              ? order
              : earliest
          )
        : null;

      // Summary statistics
      const summary = {
        totalRevenue,
        totalOrders: allOrders.length,
        uniqueCustomers: new Set(allOrders.map((o) => o.customerId)).size,
        averageOrderValue: allOrders.length > 0
          ? totalRevenue / allOrders.length
          : 0,
        firstOrderDate: firstOrder?.deliveredAt?.toISOString() || null,
        yearsInBusiness: firstOrder?.deliveredAt
          ? Math.floor((now.getTime() - firstOrder.deliveredAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0,
      };

      return NextResponse.json({
        summary,
        data: {
          yearlyRevenue: yearlyRevenueArray,
          topCustomers,
          topProducts,
          revenueByCategory: Object.entries(categoryRevenue.byCategory)
            .map(([category, revenue]) => ({ category, revenue }))
            .sort((a, b) => b.revenue - a.revenue),
          revenueByBrand: Object.entries(categoryRevenue.byBrand)
            .map(([brand, revenue]) => ({ brand, revenue }))
            .sort((a, b) => b.revenue - a.revenue),
        },
        metadata: {
          periodStart: firstOrder?.deliveredAt?.toISOString() || null,
          periodEnd: now.toISOString(),
          timestamp: now.toISOString(),
        },
        insights: {
          bestYear: yearlyRevenueArray.length > 0
            ? (() => {
                const best = yearlyRevenueArray.reduce((max, year) =>
                  year.revenue > max.revenue ? year : max
                );
                return {
                  year: best.year,
                  revenue: best.revenue,
                  orderCount: best.orderCount,
                  uniqueCustomers: best.uniqueCustomers,
                };
              })()
            : null,
          topCustomerContribution:
            topCustomers.length > 0 && totalRevenue > 0
              ? ((topCustomers[0].revenue / totalRevenue) * 100).toFixed(1) + "%"
              : "0%",
          categoryDiversity: Object.keys(categoryRevenue.byCategory).length,
          averageYearlyRevenue: yearlyRevenueArray.length > 0
            ? totalRevenue / yearlyRevenueArray.length
            : 0,
        },
      });
    }
  );
}
