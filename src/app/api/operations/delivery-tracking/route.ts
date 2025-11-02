import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { searchParams } = request.nextUrl;
        const routeId = searchParams.get("routeId");
        const date = searchParams.get("date");

        const where: Record<string, unknown> = {
          tenantId,
        };

        if (routeId) {
          where.routeId = routeId;
        }

        if (date) {
          const startDate = new Date(date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);

          where.estimatedArrival = {
            gte: startDate,
            lt: endDate,
          };
        }

        const stops = await db.routeStop.findMany({
          where,
          include: {
            route: {
              select: {
                id: true,
                routeName: true,
                driverName: true,
                truckNumber: true,
              },
            },
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    businessName: true,
                    contactName: true,
                    phone: true,
                    email: true,
                    shippingAddress: true,
                    shippingCity: true,
                    shippingState: true,
                    shippingZip: true,
                  },
                },
                lines: {
                  include: {
                    sku: {
                      include: {
                        product: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { route: { routeDate: "desc" } },
            { stopNumber: "asc" },
          ],
        });

        return NextResponse.json({ stops });
      } catch (error) {
        console.error("Error fetching delivery tracking:", error);
        return NextResponse.json(
          { error: "Failed to fetch delivery tracking" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
