import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const { name } = await params;
      const territoryName = decodeURIComponent(name);

      // Get all sales reps in this territory
      const salesReps = await db.salesRep.findMany({
        where: {
          tenantId,
          territoryName,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          customers: {
            where: {
              isPermanentlyClosed: false,
            },
            select: {
              id: true,
              name: true,
              lastOrderDate: true,
            },
          },
        },
      });

      if (salesReps.length === 0) {
        return NextResponse.json({ error: "Territory not found" }, { status: 404 });
      }

      // Gather all customers in this territory
      const allCustomers = salesReps.flatMap(rep => rep.customers);

      // Remove duplicates (in case customers are assigned to multiple reps in same territory)
      const uniqueCustomers = Array.from(
        new Map(allCustomers.map(c => [c.id, c])).values()
      );

      // Get all customer IDs
      const customerIds = uniqueCustomers.map(c => c.id);

      // Calculate revenue by quarter
      const now = new Date();
      const currentYear = now.getFullYear();

      const quarters = [
        {
          name: `Q1 ${currentYear}`,
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 3, 0),
        },
        {
          name: `Q2 ${currentYear}`,
          start: new Date(currentYear, 3, 1),
          end: new Date(currentYear, 6, 0),
        },
        {
          name: `Q3 ${currentYear}`,
          start: new Date(currentYear, 6, 1),
          end: new Date(currentYear, 9, 0),
        },
        {
          name: `Q4 ${currentYear}`,
          start: new Date(currentYear, 9, 1),
          end: new Date(currentYear + 1, 0, 0),
        },
      ];

      const revenueByQuarter = await Promise.all(
        quarters.map(async quarter => {
          const aggregate = await db.order.aggregate({
            where: {
              tenantId,
              customerId: {
                in: customerIds,
              },
              deliveredAt: {
                gte: quarter.start,
                lte: quarter.end,
              },
              status: {
                not: "CANCELLED",
              },
            },
            _sum: {
              total: true,
            },
          });

          return {
            quarter: quarter.name,
            revenue: Number(aggregate._sum.total ?? 0),
          };
        })
      );

      return NextResponse.json({
        territory: {
          territoryName,
          salesReps: salesReps.map(rep => ({
            id: rep.id,
            name: rep.user.fullName,
            email: rep.user.email,
            customerCount: rep.customers.length,
            isActive: rep.isActive,
          })),
          customers: uniqueCustomers.map(c => ({
            id: c.id,
            name: c.name,
            lastOrderDate: c.lastOrderDate?.toISOString() || null,
          })),
          revenueByQuarter,
        },
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
