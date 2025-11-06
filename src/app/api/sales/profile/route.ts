import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session, permissions }) => {
      const user = await db.user.findUnique({
        where: {
          id: session.user.id,
          tenantId,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              isActive: true,
              deliveryDay: true,
              deliveryDaysArray: true,
              weeklyRevenueQuota: true,
              monthlyRevenueQuota: true,
              quarterlyRevenueQuota: true,
              annualRevenueQuota: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles: user.roles.map(({ role }) => ({
            id: role.id,
            code: role.code,
            name: role.name,
          })),
          permissions: Array.from(permissions),
        },
        salesRep: user.salesRepProfile
          ? {
              id: user.salesRepProfile.id,
              territoryName: user.salesRepProfile.territoryName,
              isActive: user.salesRepProfile.isActive,
              deliveryDay: user.salesRepProfile.deliveryDay,
              deliveryDaysArray: user.salesRepProfile.deliveryDaysArray ?? [],
              quotas: {
                weekly: user.salesRepProfile.weeklyRevenueQuota,
                monthly: user.salesRepProfile.monthlyRevenueQuota,
                quarterly: user.salesRepProfile.quarterlyRevenueQuota,
                annual: user.salesRepProfile.annualRevenueQuota,
              },
            }
          : null,
      });
    },
    {
      requireSalesRep: false,
    },
  );
}
