import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { fetchGooglePlacePredictions } from "@/lib/maps/googlePlaces";

export async function GET(request: NextRequest) {
  return withAdminSession(request, async () => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    try {
      const suggestions = await fetchGooglePlacePredictions(query);
      return NextResponse.json({ suggestions });
    } catch (error) {
      console.error("Admin Google Places autocomplete failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Autocomplete failed" },
        { status: 500 }
      );
    }
  });
}
