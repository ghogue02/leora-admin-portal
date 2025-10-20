import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Get all sales reps grouped by territory
      const salesReps = await db.salesRep.findMany({
        where: {
          tenantId,
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
            },
          },
        },
      });

      // Group by territory
      const territoryMap = new Map<
        string,
        {
          territoryName: string;
          reps: Array<{
            id: string;
            name: string;
            email: string;
            customerCount: number;
            isActive: boolean;
          }>;
          customerCount: number;
          repCount: number;
        }
      >();

      for (const rep of salesReps) {
        const territoryName = rep.territoryName || "Unassigned";

        if (!territoryMap.has(territoryName)) {
          territoryMap.set(territoryName, {
            territoryName,
            reps: [],
            customerCount: 0,
            repCount: 0,
          });
        }

        const territory = territoryMap.get(territoryName)!;
        territory.reps.push({
          id: rep.id,
          name: rep.user.fullName,
          email: rep.user.email,
          customerCount: rep.customers.length,
          isActive: rep.isActive,
        });
        territory.customerCount += rep.customers.length;
        territory.repCount += 1;
      }

      // Get revenue for each territory
      const territories = await Promise.all(
        Array.from(territoryMap.values()).map(async territory => {
          // Get all customer IDs for this territory
          const customerIds = territory.reps.flatMap(rep =>
            salesReps
              .find(sr => sr.id === rep.id)
              ?.customers.map(c => c.id) || []
          );

          // Calculate total revenue for the territory
          const revenueAggregate = await db.order.aggregate({
            where: {
              tenantId,
              customerId: {
                in: customerIds,
              },
              status: {
                not: "CANCELLED",
              },
            },
            _sum: {
              total: true,
            },
          });

          const totalRevenue = Number(revenueAggregate._sum.total ?? 0);

          // Find primary rep (first active rep, or first rep)
          const primaryRep =
            territory.reps.find(r => r.isActive) || territory.reps[0];

          return {
            territoryName: territory.territoryName,
            repCount: territory.repCount,
            customerCount: territory.customerCount,
            totalRevenue,
            primaryRep: primaryRep
              ? {
                  id: primaryRep.id,
                  name: primaryRep.name,
                  email: primaryRep.email,
                }
              : undefined,
          };
        })
      );

      // Sort by territory name
      territories.sort((a, b) => a.territoryName.localeCompare(b.territoryName));

      return NextResponse.json({
        territories,
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
