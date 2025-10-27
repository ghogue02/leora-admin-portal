import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get("location");
    const radius = parseInt(searchParams.get("radius") || "10");

    if (!location) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    // Geocode the location first
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        location
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    if (!geocodeResponse.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
    }

    const geocodeData = await geocodeResponse.json();
    if (geocodeData.results.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    // Get all customers with addresses
    const customers = await prisma.customer.findMany({
      include: {
        addresses: true,
      },
    });

    // Filter customers within radius
    let nearbyCount = 0;
    const nearbyCustomers = [];

    for (const customer of customers) {
      for (const address of customer.addresses) {
        if (address.latitude && address.longitude) {
          const distance = calculateDistance(
            lat,
            lng,
            address.latitude,
            address.longitude
          );

          if (distance <= radius) {
            nearbyCount++;
            nearbyCustomers.push({
              ...customer,
              distance: Math.round(distance * 10) / 10,
            });
            break;
          }
        }
      }
    }

    // Sort by distance
    nearbyCustomers.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      count: nearbyCount,
      customers: nearbyCustomers.slice(0, 20), // Return top 20
      centerLocation: { lat, lng },
    });
  } catch (error) {
    console.error("Error finding nearby accounts:", error);
    return NextResponse.json(
      { error: "Failed to find nearby accounts" },
      { status: 500 }
    );
  }
}
