import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const search = request.nextUrl.searchParams.get("search");

        const where: Prisma.InventoryWhereInput = {
          tenantId,
        };

        if (search) {
          where.OR = [
            {
              location: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              sku: {
                code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              sku: {
                product: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ];
        }

        const inventories = await db.inventory.findMany({
          where,
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
          orderBy: [{ location: "asc" }],
        });

        return NextResponse.json({ inventories });
      } catch (error) {
        console.error("Error fetching inventory locations:", error);
        return NextResponse.json(
          { error: "Failed to fetch locations" },
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
    async ({ db, tenantId }) => {
      try {
        const { skuId, location, aisle, row } = body;

        if (!skuId || !location) {
          return NextResponse.json(
            { error: "SKU ID and location are required" },
            { status: 400 },
          );
        }

        const locationRegex = /^[A-Z]\d+-[A-Z]?\d+-[A-Z]?\d+$/;
        if (!locationRegex.test(location)) {
          return NextResponse.json(
            { error: "Invalid location format. Use: A1-B2-S3" },
            { status: 400 },
          );
        }

        const existingInventory = await db.inventory.findFirst({
          where: {
            tenantId,
            skuId,
          },
        });

        let inventory;

        if (existingInventory) {
          inventory = await db.inventory.update({
            where: { id: existingInventory.id },
            data: {
              location,
              aisle,
              row,
            },
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          });
        } else {
          inventory = await db.inventory.create({
            data: {
              tenantId,
              skuId,
              location,
              aisle,
              row,
              onHand: 0,
              allocated: 0,
            },
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          });
        }

        return NextResponse.json(
          { inventory },
          { status: existingInventory ? 200 : 201 },
        );
      } catch (error) {
        console.error("Error setting location:", error);
        return NextResponse.json(
          { error: "Failed to set location" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
