import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const where: Prisma.PickSheetWhereInput = {
          tenantId,
        };

        if (status && status !== "all") {
          where.status = status as any;
        }

        if (date) {
          const startDate = new Date(date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);

          where.createdAt = {
            gte: startDate,
            lt: endDate,
          };
        }

        const pickSheets = await db.pickSheet.findMany({
          where,
          include: {
            items: {
              include: {
                sku: {
                  include: {
                    product: true,
                    inventories: {
                      where: { tenantId },
                      take: 1,
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
                    order: {
                      select: {
                        id: true,
                        orderedAt: true,
                      },
                    },
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
          orderBy: {
            createdAt: "desc",
          },
        });

        return NextResponse.json({ pickSheets });
      } catch (error) {
        console.error("Error fetching pick sheets:", error);
        return NextResponse.json(
          { error: "Failed to fetch pick sheets" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      try {
        const { orderIds, pickerName } = body;

        if (!orderIds || orderIds.length === 0) {
          return NextResponse.json(
            { error: "At least one order is required" },
            { status: 400 },
          );
        }

        const lastPickSheet = await db.pickSheet.findFirst({
          where: { tenantId },
          orderBy: { sheetNumber: "desc" },
        });

        const nextNumber = lastPickSheet
          ? parseInt(lastPickSheet.sheetNumber.split("-").pop() || "0", 10) + 1
          : 1;

        const sheetNumber = `PS-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`;

        const orderLines = await db.orderLine.findMany({
          where: {
            tenantId,
            orderId: { in: orderIds },
          },
          include: {
            sku: {
              include: {
                inventories: {
                  where: { tenantId },
                  orderBy: { onHand: "desc" },
                  take: 1,
                },
                product: true,
              },
            },
            order: {
              include: {
                customer: true,
              },
            },
          },
        });

        if (orderLines.length === 0) {
          return NextResponse.json(
            { error: "No items found in selected orders" },
            { status: 400 },
          );
        }

        const optimizedItems = orderLines.map((line) => {
          const location = line.sku.inventories[0]?.location || "ZZZ-999-999";
          const [aisle = "ZZZ", bay = "999", shelf = "999"] = location.split("-");

          const numericBay = parseInt(bay, 10) || 999;
          const numericShelf = parseInt(shelf, 10) || 999;

          return {
            orderLine: line,
            location,
            sortKey: `${aisle}-${String(numericBay).padStart(3, "0")}-${String(numericShelf).padStart(3, "0")}`,
          };
        });

        optimizedItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        const pickSheet = await db.pickSheet.create({
          data: {
            tenantId,
            sheetNumber,
            pickerName: pickerName || "Unassigned",
            status: "READY",
            createdById: session.user.id,
            items: {
              create: optimizedItems.map((item, index) => ({
                tenantId,
                orderLineId: item.orderLine.id,
                skuId: item.orderLine.skuId,
                customerId: item.orderLine.order.customerId,
                quantity: item.orderLine.quantity,
                pickOrder: index + 1,
              })),
            },
          },
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

        await db.order.updateMany({
          where: {
            id: { in: orderIds },
            tenantId,
          },
          data: {
            pickSheetStatus: "picking",
            pickSheetId: pickSheet.id,
          },
        });

        return NextResponse.json({ pickSheet }, { status: 201 });
      } catch (error) {
        console.error("Error creating pick sheet:", error);
        return NextResponse.json(
          { error: "Failed to create pick sheet" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
