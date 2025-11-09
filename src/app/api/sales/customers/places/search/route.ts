import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { fetchGooglePlacePredictions } from "@/lib/maps/googlePlaces";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async () => {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("query")?.trim();

      if (!query) {
        return NextResponse.json({ error: "query is required" }, { status: 400 });
      }

      try {
        const suggestions = await fetchGooglePlacePredictions(query);
        return NextResponse.json({ suggestions });
      } catch (error) {
        console.error("Sales Google Places autocomplete failed:", error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Autocomplete failed" },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false }
  );
}
