import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { fetchGooglePlaceDetails } from "@/lib/maps/googlePlaces";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const customQuery = searchParams.get("query")?.trim();
    const placeId = searchParams.get("placeId")?.trim();
    const customerId = id;

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const queryParts = customQuery
      ? [customQuery]
      : [
          customer.name,
          customer.city ?? "",
          customer.state ?? "",
          customer.postalCode ?? "",
          customer.street1 ?? "",
        ].filter(Boolean);

    const queryString = queryParts.join(" ").trim();

    if (!placeId && !queryString) {
      return NextResponse.json({ error: "Customer name or address missing" }, { status: 400 });
    }

    try {
      const suggestion = await fetchGooglePlaceDetails({
        placeId: placeId || undefined,
        query: placeId ? undefined : queryString,
      });

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
      console.error("Admin Google Places lookup failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Lookup failed" },
        { status: 500 }
      );
    }
  });
}
