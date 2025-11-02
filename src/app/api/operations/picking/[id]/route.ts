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
        const pickSheet = await db.pickSheet.findFirst({
          where: {
            id: params.id,
            tenantId,
          },
          include: {
            items: {
              include: {
                sku: {
                  include: {
                    product: true,
                    inventories: {
                      where: { tenantId },
                    },
                  },
                },
                customer: {
                  select: {
                    id: true,
                    businessName: true,
                    shippingAddress: true,
                    shippingCity: true,
                    shippingState: true,
                    shippingZip: true,
                  },
                },
                OrderLine: {
                  include: {
                    order: true,
                  },
                },
              },
              orderBy: {
                pickOrder: "asc",
              },
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (!pickSheet) {
          return NextResponse.json(
            { error: "Pick sheet not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({ pickSheet });
      } catch (error) {
        console.error("Error fetching pick sheet:", error);
        return NextResponse.json(
          { error: "Failed to fetch pick sheet" },
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
        const { status, pickerName, startedAt, completedAt } = body;

        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (pickerName) updateData.pickerName = pickerName;
        if (startedAt) updateData.startedAt = new Date(startedAt);
        if (completedAt) updateData.completedAt = new Date(completedAt);

        const pickSheet = await db.pickSheet.update({
          where: {
            id: params.id,
            tenantId,
          },
          data: updateData,
          include: {
            items: {
              include: {
                sku: {
                  include: {
                    product: true,
                    inventories: true,
                  },
                },
                customer: true,
              },
              orderBy: {
                pickOrder: "asc",
              },
            },
          },
        });

        return NextResponse.json({ pickSheet });
      } catch (error) {
        console.error("Error updating pick sheet:", error);
        return NextResponse.json(
          { error: "Failed to update pick sheet" },
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
        await db.pickSheet.delete({
          where: {
            id: params.id,
            tenantId,
          },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error deleting pick sheet:", error);
        return NextResponse.json(
          { error: "Failed to delete pick sheet" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
