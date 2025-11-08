import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { fetchGooglePlaceSuggestion } from "@/lib/maps/googlePlaces";
import type { PrismaClient } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

async function ensureSalesAccess(db: PrismaClient, tenantId: string, userId: string, customerId: string) {
  const salesRep = await db.salesRep.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  if (!salesRep) {
    return { error: NextResponse.json({ error: "Sales rep profile not found" }, { status: 404 }) };
  }

  const customer = await db.customer.findUnique({
    where: {
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    return { error: NextResponse.json({ error: "Customer not found" }, { status: 404 }) };
  }

  if (customer.salesRepId !== salesRep.id) {
    return { error: NextResponse.json({ error: "You do not have access to this customer" }, { status: 403 }) };
  }

  return { customer };
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { customerId } = await context.params;
    const access = await ensureSalesAccess(db, tenantId, session.user.id, customerId);
    if ("error" in access) return access.error;

    const customer = access.customer;
    const queryParts = [
      customer.name,
      customer.city ?? "",
      customer.state ?? "",
      customer.postalCode ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    if (!queryParts.trim()) {
      return NextResponse.json({ error: "Customer name or address missing" }, { status: 400 });
    }

    try {
      const suggestion = await fetchGooglePlaceSuggestion(queryParts);

      if (suggestion?.location) {
        await db.customer.update({
          where: {
            id: customerId,
            tenantId,
          },
          data: {
            latitude: suggestion.location.lat,
            longitude: suggestion.location.lng,
            geocodedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ suggestion });
    } catch (error) {
      console.error("Google Places lookup failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Lookup failed" },
        { status: 500 }
      );
    }
  });
}
