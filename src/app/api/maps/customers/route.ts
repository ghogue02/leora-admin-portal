import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const territories = searchParams.getAll("territories");
      const accountTypes = searchParams.getAll("accountTypes");
      const salesReps = searchParams.getAll("salesReps");

      const where: Prisma.CustomerWhereInput = {
        tenantId,
        latitude: { not: null },
        longitude: { not: null },
      };

      if (territories.length > 0) {
        where.territory = { in: territories };
      }

      if (accountTypes.length > 0) {
        where.accountType = { in: accountTypes };
      }

      if (salesReps.length > 0) {
        where.salesRepId = { in: salesReps };
      }

      const customers = await db.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          street1: true,
          street2: true,
          city: true,
          state: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          accountType: true,
          accountPriority: true,
          territory: true,
          salesRepId: true,
          phone: true,
          lastOrderDate: true,
          orders: {
            where: {
              status: { not: "CANCELLED" },
            },
            select: {
              totalAmount: true,
            },
          },
        },
      });

      const customersWithRevenue = customers.map((customer) => {
        const revenue = customer.orders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0,
        );

        return {
          id: customer.id,
          name: customer.name,
          address: `${customer.street1 || ""}`,
          city: customer.city || "",
          state: customer.state || "",
          zip: customer.postalCode || "",
          latitude: customer.latitude,
          longitude: customer.longitude,
          accountType: customer.accountType || "PROSPECT",
          priority: customer.accountPriority || "MEDIUM",
          revenue,
          lastOrderDate: customer.lastOrderDate?.toISOString() || null,
          phone: customer.phone || "",
          territoryId: customer.territory,
          salesRepId: customer.salesRepId,
        };
      });

      return NextResponse.json(customersWithRevenue);
    } catch (error) {
      console.error("[maps/customers] Failed to fetch customers:", error);
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 },
      );
    }
  });
}
