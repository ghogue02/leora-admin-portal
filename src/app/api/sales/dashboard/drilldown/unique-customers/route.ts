import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, format } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      console.log("🔍 [unique-customers] Starting drilldown");
      console.log("🔍 [unique-customers] Tenant ID:", tenantId);
      console.log("🔍 [unique-customers] User ID:", session.user.id);

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
        console.log("❌ [unique-customers] Sales rep profile not found");
        return NextResponse.json({ error: "Sales rep profile not found" }, { status: 404 });
      }

      console.log("✅ [unique-customers] Sales rep found:", salesRep.id);

      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      // Get all delivered orders for the current week with customer details
      const currentWeekOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: currentWeekStart,
            lte: currentWeekEnd,
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
              billingEmail: true,
              phone: true,
              street1: true,
              city: true,
              state: true,
              postalCode: true,
              territory: true,
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

      // Group orders by customer
      const customerData = currentWeekOrders.reduce(
        (acc, order) => {
          const customerId = order.customer.id;
          if (!acc[customerId]) {
            acc[customerId] = {
              customer: {
                id: order.customer.id,
                name: order.customer.name,
                accountNumber: order.customer.accountNumber,
                email: order.customer.email,
                phone: order.customer.phone,
                location: {
                  address: order.customer.address,
                  city: order.customer.city,
                  state: order.customer.state,
                  postalCode: order.customer.postalCode,
                },
                territory: order.customer.territory,
              },
              orders: [],
              totalSpent: 0,
              orderCount: 0,
              productsPurchased: new Set<string>(),
              categoriesPurchased: new Set<string>(),
              firstOrderDate: order.deliveredAt,
              lastOrderDate: order.deliveredAt,
            };
          }

          // Add order details
          const orderTotal = Number(order.total || 0);
          acc[customerId].orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            total: orderTotal,
            deliveredAt: order.deliveredAt?.toISOString() || null,
            status: order.status,
            itemCount: order.lines.length,
            products: order.lines.map((line) => ({
              productName: line.sku.product.name,
              brand: line.sku.product.brand,
              category: line.sku.product.category,
              skuCode: line.sku.code,
              quantity: line.quantity,
              unitPrice: Number(line.unitPrice),
              lineTotal: Number(line.unitPrice) * line.quantity,
            })),
          });

          // Update aggregates
          acc[customerId].totalSpent += orderTotal;
          acc[customerId].orderCount += 1;

          // Track products and categories
          order.lines.forEach((line) => {
            acc[customerId].productsPurchased.add(line.sku.product.name);
            if (line.sku.product.category) {
              acc[customerId].categoriesPurchased.add(line.sku.product.category);
            }
          });

          // Update date range
          if (order.deliveredAt) {
            if (order.deliveredAt < acc[customerId].firstOrderDate!) {
              acc[customerId].firstOrderDate = order.deliveredAt;
            }
            if (order.deliveredAt > acc[customerId].lastOrderDate!) {
              acc[customerId].lastOrderDate = order.deliveredAt;
            }
          }

          return acc;
        },
        {} as Record<string, any>
      );

      // Convert to array and add calculated metrics
      const customers = Object.values(customerData)
        .map((item: any) => ({
          customer: item.customer,
          orders: item.orders,
          metrics: {
            totalSpent: item.totalSpent,
            orderCount: item.orderCount,
            averageOrderValue: item.orderCount > 0 ? item.totalSpent / item.orderCount : 0,
            uniqueProducts: item.productsPurchased.size,
            uniqueCategories: item.categoriesPurchased.size,
          },
          dateRange: {
            firstOrder: item.firstOrderDate?.toISOString() || null,
            lastOrder: item.lastOrderDate?.toISOString() || null,
          },
        }))
        .sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent);

      // Calculate summary statistics
      const totalRevenue = customers.reduce((sum, c) => sum + c.metrics.totalSpent, 0);
      const totalOrders = customers.reduce((sum, c) => sum + c.metrics.orderCount, 0);

      // Segment customers by spend tier
      const highValueCustomers = customers.filter((c) => c.metrics.totalSpent >= 1000);
      const mediumValueCustomers = customers.filter(
        (c) => c.metrics.totalSpent >= 500 && c.metrics.totalSpent < 1000
      );
      const standardValueCustomers = customers.filter((c) => c.metrics.totalSpent < 500);

      const summary = {
        uniqueCustomers: customers.length,
        totalRevenue,
        totalOrders,
        averageRevenuePerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0,
        averageOrdersPerCustomer: customers.length > 0 ? totalOrders / customers.length : 0,
        segmentation: {
          highValue: {
            count: highValueCustomers.length,
            threshold: 1000,
            revenue: highValueCustomers.reduce((sum, c) => sum + c.metrics.totalSpent, 0),
          },
          mediumValue: {
            count: mediumValueCustomers.length,
            threshold: 500,
            revenue: mediumValueCustomers.reduce((sum, c) => sum + c.metrics.totalSpent, 0),
          },
          standard: {
            count: standardValueCustomers.length,
            revenue: standardValueCustomers.reduce((sum, c) => sum + c.metrics.totalSpent, 0),
          },
        },
      };

      // Find top performing customer
      const topCustomer = customers.length > 0 ? customers[0] : null;

      // Calculate customer concentration
      const topFiveRevenue = customers
        .slice(0, 5)
        .reduce((sum, c) => sum + c.metrics.totalSpent, 0);
      const customerConcentration = totalRevenue > 0 ? (topFiveRevenue / totalRevenue) * 100 : 0;

      console.log("✅ [unique-customers] Query completed, returning results");
      return NextResponse.json({
        summary,
        data: {
          customers,
          highValueCustomers: highValueCustomers.slice(0, 10),
          newCustomersThisWeek: customers.filter((c) => {
            const firstOrder = c.dateRange.firstOrder ? new Date(c.dateRange.firstOrder) : null;
            return firstOrder && firstOrder >= currentWeekStart && firstOrder <= currentWeekEnd;
          }),
        },
        metadata: {
          weekStart: currentWeekStart.toISOString(),
          weekEnd: currentWeekEnd.toISOString(),
          timestamp: now.toISOString(),
        },
        insights: {
          topCustomer: topCustomer
            ? {
                name: topCustomer.customer.name,
                spent: topCustomer.metrics.totalSpent,
                orders: topCustomer.metrics.orderCount,
              }
            : null,
          customerConcentration: customerConcentration.toFixed(1) + "%",
          averageOrderFrequency:
            customers.length > 0 ? (totalOrders / customers.length).toFixed(1) : "0",
          highValuePercentage:
            customers.length > 0
              ? ((highValueCustomers.length / customers.length) * 100).toFixed(1) + "%"
              : "0%",
        },
      });
    } catch (error) {
      console.error("❌ [unique-customers] Error in drilldown:", error);
      console.error(
        "❌ [unique-customers] Error details:",
        error instanceof Error ? error.message : String(error)
      );
      return NextResponse.json(
        {
          error: "Failed to load unique customers data",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  });
}
