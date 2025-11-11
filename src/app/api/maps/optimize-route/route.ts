import { NextRequest, NextResponse } from "next/server";
import { calculateDistance } from "@/lib/distance";
import { withSalesSession } from "@/lib/auth/sales";

type RoutePoint = { latitude: number; longitude: number };

type RouteStop = {
  id: string;
  name: string;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  accountType: string | null;
};

function optimizeRoute2Opt(start: RoutePoint, stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return stops;

  let route = [...stops];
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const currentDistance =
          (i === 0
            ? calculateDistance(start, route[i])
            : calculateDistance(route[i - 1], route[i])) +
          calculateDistance(route[i], route[i + 1]) +
          calculateDistance(route[j - 1], route[j]) +
          (j < route.length - 1
            ? calculateDistance(route[j], route[j + 1])
            : 0);

        const newRoute = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];

        const newDistance =
          (i === 0
            ? calculateDistance(start, newRoute[i])
            : calculateDistance(newRoute[i - 1], newRoute[i])) +
          calculateDistance(newRoute[i], newRoute[i + 1]) +
          calculateDistance(newRoute[j - 1], newRoute[j]) +
          (j < newRoute.length - 1
            ? calculateDistance(newRoute[j], newRoute[j + 1])
            : 0);

        if (newDistance < currentDistance) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const body = await request.json();
      const {
        startLatitude,
        startLongitude,
        customerIds,
        algorithm = "2-opt",
      }: {
        startLatitude: number;
        startLongitude: number;
        customerIds: string[];
        algorithm?: string;
      } = body;

      if (!customerIds?.length) {
        return NextResponse.json({ error: "Customer IDs are required" }, { status: 400 });
      }

      if (typeof startLatitude !== "number" || typeof startLongitude !== "number") {
        return NextResponse.json(
          { error: "Start location (latitude, longitude) is required" },
          { status: 400 },
        );
      }

      const customers = await db.customer.findMany({
        where: {
          id: { in: customerIds },
          tenantId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          street1: true,
          street2: true,
          city: true,
          state: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          phone: true,
          accountType: true,
        },
      });

      if (customers.length === 0) {
        return NextResponse.json({ error: "No valid customers found" }, { status: 404 });
      }

      const start: RoutePoint = {
        latitude: startLatitude,
        longitude: startLongitude,
      };

      const optimizedStops = optimizeRoute2Opt(
        start,
        customers.map<RouteStop>((customer) => ({
          id: customer.id,
          name: customer.name,
          street1: customer.street1,
          street2: customer.street2,
          city: customer.city,
          state: customer.state,
          postalCode: customer.postalCode,
          latitude: customer.latitude as number,
          longitude: customer.longitude as number,
          phone: customer.phone,
          accountType: customer.accountType,
        })),
      );

      const segments: Array<{
        from: { name: string; address: string; latitude?: number; longitude?: number };
        to: {
          id: string;
          name: string;
          address: string;
          city: string;
          state: string;
          postalCode: string;
        };
        distance: number;
        drivingTime: number;
      }> = [];

      let totalDistance = 0;
      let totalDuration = 0;
      let currentPosition: RoutePoint = start;

      for (let i = 0; i < optimizedStops.length; i++) {
        const stop = optimizedStops[i];
        const distance = calculateDistance(currentPosition, stop);
        const drivingTime = Math.round((distance / 35) * 60);
        const stopDuration = 15;

        segments.push({
          from:
            i === 0
              ? { ...start, name: "Start", address: "Starting location" }
              : {
                  name: optimizedStops[i - 1].name,
                  address: optimizedStops[i - 1].street1 || "",
                },
          to: {
            id: stop.id,
            name: stop.name,
            address: [stop.street1, stop.street2].filter(Boolean).join(", "),
            city: stop.city || "",
            state: stop.state || "",
            postalCode: stop.postalCode || "",
          },
          distance,
          drivingTime,
        });

        totalDistance += distance;
        totalDuration += drivingTime + stopDuration;
        currentPosition = stop;
      }

      const directions = segments.map((segment, index) => ({
        step: index + 1,
        instruction: `Drive ${segment.distance.toFixed(1)} miles to ${segment.to.name}`,
        address: segment.to.address,
        distance: segment.distance,
        duration: segment.drivingTime,
      }));

      return NextResponse.json({
        optimizedRoute: {
          stops: optimizedStops.map((stop, index) => ({
            order: index + 1,
            id: stop.id,
            name: stop.name,
            address: [stop.street1, stop.street2].filter(Boolean).join(", "),
            city: stop.city || "",
            state: stop.state || "",
            postalCode: stop.postalCode || "",
            latitude: stop.latitude,
            longitude: stop.longitude,
            phone: stop.phone || "",
            accountType: stop.accountType,
          })),
          totalDistance,
          totalDuration,
          segments,
          directions,
        },
        algorithm,
        iterations: algorithm === "2-opt" ? 100 : 1,
      });
    } catch (error) {
      console.error("[maps/optimize-route] Failed to optimize route:", error);
      return NextResponse.json(
        { error: "Failed to optimize route" },
        { status: 500 },
      );
    }
  });
}
