import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude required" },
        { status: 400 }
      );
    }

    // Reverse geocode using Google Maps API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
    }

    const data = await response.json();
    if (data.results.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const address = data.results[0].formatted_address;

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
