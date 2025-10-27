import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const territoryName = decodeURIComponent(name);

  return withSalesSession(request, async ({ db, tenantId }) => {
    // Find rep with this territory
    const rep = await db.salesRep.findFirst({
      where: {
        tenantId,
        territoryName,
        isActive: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!rep) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    // Get all customers in this territory
    const customers = await db.customer.findMany({
      where: {
        salesRepId: rep.id,
        isPermanentlyClosed: false,
      },
      include: {
        orders: {
          where: {
            status: {
              not: "CANCELLED",
            },
          },
          select: {
            deliveredAt: true,
            total: true,
          },
        },
      },
    });

    // Calculate account data
    const accounts = customers.map((customer) => {
      const totalRevenue = customer.orders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      const orderDates = customer.orders
        .map((o) => o.deliveredAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

      return {
        id: customer.id,
        name: customer.name,
        riskStatus: customer.riskStatus,
        revenue: totalRevenue,
        orderCount: customer.orders.length,
        lastOrderDate: orderDates[0] || null,
      };
    });

    // Health breakdown
    const healthBreakdown = accounts.reduce(
      (acc, account) => {
        if (account.riskStatus === "HEALTHY") {
          acc.healthy++;
        } else if (
          account.riskStatus === "AT_RISK_CADENCE" ||
          account.riskStatus === "AT_RISK_REVENUE"
        ) {
          acc.atRisk++;
        } else if (account.riskStatus === "DORMANT") {
          acc.dormant++;
        }
        return acc;
      },
      { healthy: 0, atRisk: 0, dormant: 0 }
    );

    // Revenue distribution (top 10 accounts)
    const revenueDistribution = accounts
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((account) => ({
        name: account.name,
        value: account.revenue,
      }));

    // Stats
    const totalRevenue = accounts.reduce((sum, acc) => sum + acc.revenue, 0);
    const avgRevenuePerAccount = accounts.length > 0 ? totalRevenue / accounts.length : 0;

    return NextResponse.json({
      territory: {
        name: territoryName,
        repName: rep.user.fullName,
      },
      accounts,
      healthBreakdown,
      revenueDistribution,
      stats: {
        totalRevenue,
        totalAccounts: accounts.length,
        avgRevenuePerAccount,
      },
    });
  });
}
