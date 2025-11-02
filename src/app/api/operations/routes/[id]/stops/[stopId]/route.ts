import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteParams = {
  params: {
    id: string;
    stopId: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { status, actualArrival, notes } = body;

        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        if (status === "completed" || status === "delivered") {
          updateData.actualArrival = actualArrival ? new Date(actualArrival) : new Date();
        }

        const stop = await db.routeStop.update({
          where: {
            id: params.stopId,
            tenantId,
          },
          data: updateData,
          include: {
            order: {
              include: {
                customer: true,
              },
            },
          },
        });

        if (status === "completed" || status === "delivered") {
          await db.order.update({
            where: {
              id: stop.orderId,
            },
            data: {
              deliveredAt: updateData.actualArrival as Date | undefined,
              status: "FULFILLED",
            },
          });
        }

        return NextResponse.json({ stop });
      } catch (error) {
        console.error("Error updating route stop:", error);
        return NextResponse.json(
          { error: "Failed to update stop" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
