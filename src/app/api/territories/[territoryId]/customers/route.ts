/**
 * Territory Customers API Route
 */

import { NextRequest, NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  getCustomersInTerritory,
  assignCustomersToTerritory,
} from "@/lib/territory-management";
import { withSalesSession } from "@/lib/auth/sales";

async function assertTerritoryAccess(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  territoryId: string,
) {
  const territory = await db.territory.findUnique({
    where: { id: territoryId },
    select: { id: true, tenantId: true },
  });

  if (!territory || territory.tenantId !== tenantId) {
    return null;
  }

  return territory;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { territoryId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const territory = await assertTerritoryAccess(db, tenantId, params.territoryId);
      if (!territory) {
        return NextResponse.json({ error: "Territory not found" }, { status: 404 });
      }

      const customers = await getCustomersInTerritory(params.territoryId);
      return NextResponse.json({ success: true, customers });
    } catch (error) {
      console.error("[territories/:id/customers] Failed to load customers:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { territoryId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const territory = await assertTerritoryAccess(db, tenantId, params.territoryId);
      if (!territory) {
        return NextResponse.json({ error: "Territory not found" }, { status: 404 });
      }

      const body = await request.json();
      const { boundaries } = body;

      if (!boundaries) {
        return NextResponse.json({ error: "Boundaries are required" }, { status: 400 });
      }

      await db.territory.update({
        where: { id: params.territoryId },
        data: { boundaries },
      });

      const count = await assignCustomersToTerritory(params.territoryId, boundaries);
      return NextResponse.json({ success: true, customersAssigned: count });
    } catch (error) {
      console.error("[territories/:id/customers] Failed to assign customers:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}
