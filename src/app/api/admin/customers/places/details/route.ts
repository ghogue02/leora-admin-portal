import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { fetchGooglePlaceDetails } from "@/lib/maps/googlePlaces";

export async function GET(request: NextRequest) {
  return withAdminSession(request, async () => {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId")?.trim();
    const query = searchParams.get("query")?.trim();

    if (!placeId && !query) {
      return NextResponse.json({ error: "placeId or query is required" }, { status: 400 });
    }

    try {
      const suggestion = await fetchGooglePlaceDetails({
        placeId: placeId || undefined,
        query: placeId ? undefined : query,
      });
      return NextResponse.json({ suggestion });
    } catch (error) {
      console.error("Admin Google Places details failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Details lookup failed" },
        { status: 500 }
      );
    }
  });
}
