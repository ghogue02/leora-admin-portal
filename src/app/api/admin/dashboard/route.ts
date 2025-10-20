import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";

/**
 * GET /api/admin/dashboard
 * Returns key metrics and data integrity alerts for the admin dashboard
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId, db }) => {
    try {
      // Get current week dates
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      // Fetch all metrics in parallel
      const [
        totalCustomers,
        totalOrders,
        activePortalUsers,
        pendingOrders,
        weeklyOrders,
        customersWithoutSalesRep,
        ordersWithoutInvoice,
        customersWithoutEmail,
      ] = await Promise.all([
        // Total customers count
        db.customer.count({
          where: {
            tenantId,
            isPermanentlyClosed: false,
          },
        }),

        // Total orders count
        db.order.count({
          where: {
            tenantId,
          },
        }),

        // Active portal users count
        db.portalUser.count({
          where: {
            tenantId,
            status: "ACTIVE",
          },
        }),

        // Pending orders count (SUBMITTED or DRAFT status)
        db.order.count({
          where: {
            tenantId,
            status: {
              in: ["SUBMITTED", "DRAFT"],
            },
          },
        }),

        // Orders from this week for revenue calculation
        db.order.findMany({
          where: {
            tenantId,
            orderedAt: {
              gte: weekStart,
            },
            status: {
              not: "CANCELLED",
            },
          },
          select: {
            total: true,
          },
        }),

        // Data integrity: Customers without sales rep
        db.customer.count({
          where: {
            tenantId,
            salesRepId: null,
            isPermanentlyClosed: false,
          },
        }),

        // Data integrity: Orders without invoice
        db.order.count({
          where: {
            tenantId,
            status: {
              in: ["FULFILLED", "PARTIALLY_FULFILLED"],
            },
            invoices: {
              none: {},
            },
          },
        }),

        // Data integrity: Customers without email
        db.customer.count({
          where: {
            tenantId,
            billingEmail: null,
            isPermanentlyClosed: false,
          },
        }),
      ]);

      // Calculate weekly revenue
      const weeklyRevenue = weeklyOrders.reduce((sum, order) => {
        return sum + (order.total ? Number(order.total) : 0);
      }, 0);

      // Build data integrity alerts
      const alerts = [];

      if (customersWithoutSalesRep > 0) {
        alerts.push({
          type: "customers_without_rep",
          count: customersWithoutSalesRep,
          message: `${customersWithoutSalesRep} customer${customersWithoutSalesRep > 1 ? "s" : ""} without sales rep assignment`,
          href: "/admin/customers?filter=no-rep",
        });
      }

      if (ordersWithoutInvoice > 0) {
        alerts.push({
          type: "orders_without_invoice",
          count: ordersWithoutInvoice,
          message: `${ordersWithoutInvoice} fulfilled order${ordersWithoutInvoice > 1 ? "s" : ""} without invoice`,
          href: "/admin/orders?filter=no-invoice",
        });
      }

      if (customersWithoutEmail > 0) {
        alerts.push({
          type: "customers_without_email",
          count: customersWithoutEmail,
          message: `${customersWithoutEmail} customer${customersWithoutEmail > 1 ? "s" : ""} without email address`,
          href: "/admin/customers?filter=no-email",
        });
      }

      return NextResponse.json({
        metrics: {
          totalCustomers,
          totalOrders,
          weeklyRevenue,
          activeUsers: activePortalUsers,
          pendingOrders,
        },
        alerts,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return NextResponse.json(
        { error: "Failed to fetch dashboard data" },
        { status: 500 },
      );
    }
  });
}
