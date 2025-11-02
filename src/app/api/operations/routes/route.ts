import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const where: Prisma.DeliveryRouteWhereInput = {
          tenantId,
        };

        if (date) {
          const routeDate = new Date(date);
          const nextDay = new Date(routeDate);
          nextDay.setDate(nextDay.getDate() + 1);

          where.routeDate = {
            gte: routeDate,
            lt: nextDay,
          };
        }

        const routes = await db.deliveryRoute.findMany({
          where,
          include: {
            stops: {
              include: {
                order: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        businessName: true,
                        contactName: true,
                        phone: true,
                        shippingAddress: true,
                        shippingCity: true,
                        shippingState: true,
                        shippingZip: true,
                      },
                    },
                    lines: {
                      include: {
                        sku: {
                          include: {
                            product: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                stopNumber: "asc",
              },
            },
          },
          orderBy: {
            routeDate: "desc",
          },
        });

        return NextResponse.json({ routes });
      } catch (error) {
        console.error("Error fetching routes:", error);
        return NextResponse.json(
          { error: "Failed to fetch routes" },
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
        const { routeName, routeDate, driverName, truckNumber, orderIds, startTime } = body;

        if (!routeName || !routeDate || !orderIds || orderIds.length === 0) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 },
          );
        }

        const orders = await db.order.findMany({
          where: {
            id: { in: orderIds },
            tenantId,
          },
          include: {
            customer: {
              select: {
                id: true,
                businessName: true,
                shippingAddress: true,
                shippingCity: true,
                shippingState: true,
                shippingZip: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        });

        if (orders.length === 0) {
          return NextResponse.json(
            { error: "No valid orders found" },
            { status: 400 },
          );
        }

        const sortedOrders = orders.sort((a, b) => {
          const zipA = a.customer?.shippingZip || "";
          const zipB = b.customer?.shippingZip || "";
          return zipA.localeCompare(zipB);
        });

        const routeStartTime = new Date(startTime || `${routeDate}T08:00:00`);
        const avgStopDurationMinutes = 30;

        const route = await db.deliveryRoute.create({
          data: {
            tenantId,
            routeName,
            routeDate: new Date(routeDate),
            driverName: driverName || "Unassigned",
            truckNumber: truckNumber || "",
            startTime: routeStartTime,
            estimatedEndTime: new Date(
              routeStartTime.getTime() + sortedOrders.length * avgStopDurationMinutes * 60000,
            ),
            stops: {
              create: sortedOrders.map((order, index) => {
                const estimatedArrival = new Date(
                  routeStartTime.getTime() + index * avgStopDurationMinutes * 60000,
                );

                return {
                  tenantId,
                  orderId: order.id,
                  stopNumber: index + 1,
                  estimatedArrival,
                  status: "pending",
                };
              }),
            },
          },
          include: {
            stops: {
              include: {
                order: {
                  include: {
                    customer: true,
                    lines: {
                      include: {
                        sku: {
                          include: {
                            product: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: {
                stopNumber: "asc",
              },
            },
          },
        });

        return NextResponse.json({ route }, { status: 201 });
      } catch (error) {
        console.error("Error creating route:", error);
        return NextResponse.json(
          { error: "Failed to create route" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
