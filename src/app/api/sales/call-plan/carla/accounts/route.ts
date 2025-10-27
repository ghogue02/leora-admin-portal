import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const weekStartParam = searchParams.get("weekStart");

    // Get sales rep profile
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

    // Get all customers for the sales rep with additional CARLA data
    const customers = await db.customer.findMany({
      where: {
        tenantId,
        salesRepId: salesRep.id,
        isPermanentlyClosed: false,
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        city: true,
        state: true,
        lastOrderDate: true,
        // Note: accountType and priority would need to be added to the schema
        // For now, we'll derive them from existing data
        riskStatus: true,
        establishedRevenue: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform customers to CARLA account format
    const accounts = customers.map((customer) => {
      // Derive account type from revenue and order history
      let accountType: "PROSPECT" | "TARGET" | "ACTIVE" = "PROSPECT";
      if (customer.lastOrderDate) {
        accountType = "ACTIVE";
      } else if (customer.establishedRevenue && Number(customer.establishedRevenue) > 0) {
        accountType = "TARGET";
      }

      // Derive priority from risk status
      let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (customer.riskStatus === "AT_RISK_CADENCE" || customer.riskStatus === "AT_RISK_REVENUE") {
        priority = "HIGH";
      } else if (customer.riskStatus === "DORMANT") {
        priority = "MEDIUM";
      }

      return {
        id: customer.id,
        name: customer.name,
        accountNumber: customer.accountNumber ?? undefined,
        accountType,
        priority,
        city: customer.city ?? undefined,
        state: customer.state ?? undefined,
        territory: salesRep.territoryId ?? undefined,
        lastOrderDate: customer.lastOrderDate?.toISOString() ?? undefined,
        selected: false,
      };
    });

    return NextResponse.json({
      accounts,
      weekStart: weekStartParam,
    });
  });
}
