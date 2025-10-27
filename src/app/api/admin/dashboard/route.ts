import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { startOfWeek, endOfWeek, startOfMonth } from "date-fns";

/**
 * GET /api/admin/dashboard
 * Returns key metrics and data integrity alerts for the admin dashboard
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId, db }) => {
    try {
      // Get current week dates (Monday-based to match sales dashboard)
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const monthStart = startOfMonth(now); // First day of current month

      // Fetch all metrics in parallel
      const [
        totalCustomers,
        totalOrders,
        activePortalUsers,
        pendingOrders,
        weeklyOrders,
        mtdOrders,
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

        // Orders from this week for revenue calculation (delivered orders only)
        db.order.aggregate({
          where: {
            tenantId,
            deliveredAt: {
              gte: weekStart,
              lte: weekEnd,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),

        // Orders from this month for MTD revenue calculation (delivered orders only)
        db.order.aggregate({
          where: {
            tenantId,
            deliveredAt: {
              gte: monthStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
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

      // Calculate weekly revenue and MTD revenue from aggregate results
      const weeklyRevenue = Number(weeklyOrders._sum.total ?? 0);
      const mtdRevenue = Number(mtdOrders._sum.total ?? 0);

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
          mtdRevenue,
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
