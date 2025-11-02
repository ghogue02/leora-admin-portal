import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { routeId, stopId, type, customMessage } = body;

        if (!routeId && !stopId) {
          return NextResponse.json(
            { error: "Route ID or Stop ID is required" },
            { status: 400 },
          );
        }

        let stops = [];

        if (stopId) {
          const stop = await db.routeStop.findFirst({
            where: {
              id: stopId,
              tenantId,
            },
            include: {
              order: {
                include: {
                  customer: true,
                },
              },
              route: true,
            },
          });

          if (stop) {
            stops = [stop];
          }
        } else if (routeId) {
          stops = await db.routeStop.findMany({
            where: {
              routeId,
              tenantId,
              status: "pending",
            },
            include: {
              order: {
                include: {
                  customer: true,
                },
              },
              route: true,
            },
          });
        }

        const notifications = [];

        for (const stop of stops) {
          let message = customMessage;

          if (!message) {
            switch (type) {
              case "on_the_way": {
                const eta = stop.estimatedArrival
                  ? new Date(stop.estimatedArrival).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;
                message = eta
                  ? `Your delivery is on the way! Estimated arrival: ${eta}. Driver: ${stop.route.driverName}`
                  : `Your delivery is on the way! Driver: ${stop.route.driverName}`;
                break;
              }
              case "stops_away": {
                const remainingStops = await db.routeStop.count({
                  where: {
                    routeId: stop.routeId,
                    stopNumber: { lt: stop.stopNumber },
                    status: "pending",
                    tenantId,
                  },
                });
                message = `Your delivery is ${remainingStops} stop${remainingStops !== 1 ? "s" : ""} away!`;
                break;
              }
              case "arrived":
                message = "Your delivery driver has arrived!";
                break;
              default:
                message = "Delivery update for your order";
            }
          }

          const notification = await db.portalNotification.create({
            data: {
              tenantId,
              customerId: stop.order.customerId,
              type: "DELIVERY_UPDATE",
              title: "Delivery Update",
              message,
              relatedEntityType: "order",
              relatedEntityId: stop.orderId,
            },
          });

          notifications.push(notification);
        }

        return NextResponse.json({
          success: true,
          notificationsSent: notifications.length,
          notifications,
        });
      } catch (error) {
        console.error("Error sending notifications:", error);
        return NextResponse.json(
          { error: "Failed to send notifications" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
