import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const route = await db.deliveryRoute.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
          include: {
            stops: {
              include: {
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
              orderBy: {
                stopNumber: "asc",
              },
            },
          },
        });

        if (!route) {
          return NextResponse.json(
            { error: "Route not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({ route });
      } catch (error) {
        console.error("Error fetching route:", error);
        return NextResponse.json(
          { error: "Failed to fetch route" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { driverName, truckNumber, startTime, estimatedEndTime } = body;

        const updateData: Record<string, unknown> = {};
        if (driverName) updateData.driverName = driverName;
        if (truckNumber !== undefined) updateData.truckNumber = truckNumber;
        if (startTime) updateData.startTime = new Date(startTime);
        if (estimatedEndTime) updateData.estimatedEndTime = new Date(estimatedEndTime);

        const route = await db.deliveryRoute.update({
          where: {
            id: params.id,
            tenantId,
          },
          data: updateData,
          include: {
            stops: {
              include: {
                order: {
                  include: {
                    customer: true,
                  },
                },
              },
              orderBy: {
                stopNumber: "asc",
              },
            },
          },
        });

        return NextResponse.json({ route });
      } catch (error) {
        console.error("Error updating route:", error);
        return NextResponse.json(
          { error: "Failed to update route" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        await db.deliveryRoute.delete({
          where: {
            id: params.id,
            tenantId,
          },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error deleting route:", error);
        return NextResponse.json(
          { error: "Failed to delete route" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
