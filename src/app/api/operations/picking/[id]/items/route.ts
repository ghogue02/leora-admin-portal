import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { itemId, isPicked } = body;

        if (!itemId) {
          return NextResponse.json(
            { error: "Item ID is required" },
            { status: 400 },
          );
        }

        const updateData: Record<string, unknown> = {
          isPicked,
          pickedAt: isPicked ? new Date() : null,
        };

        const item = await db.pickSheetItem.update({
          where: {
            id: itemId,
            tenantId,
          },
          data: updateData,
        });

        const pickSheet = await db.pickSheet.findUnique({
          where: { id: params.id },
          include: {
            items: true,
          },
        });

        if (pickSheet) {
          const allPicked = pickSheet.items.every((sheetItem) => sheetItem.isPicked);

          if (allPicked && pickSheet.status !== "PICKED") {
            await db.pickSheet.update({
              where: { id: params.id },
              data: {
                status: "PICKED",
                completedAt: new Date(),
              },
            });
          } else if (!allPicked && pickSheet.status === "PICKED") {
            await db.pickSheet.update({
              where: { id: params.id },
              data: {
                status: "PICKING",
                completedAt: null,
              },
            });
          }
        }

        return NextResponse.json({ item });
      } catch (error) {
        console.error("Error updating pick sheet item:", error);
        return NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
