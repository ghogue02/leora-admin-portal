import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routeId, stopId, type, customMessage } = body;

    if (!routeId && !stopId) {
      return NextResponse.json(
        { error: 'Route ID or Stop ID is required' },
        { status: 400 }
      );
    }

    let stops = [];

    if (stopId) {
      // Send notification for specific stop
      const stop = await prisma.routeStop.findFirst({
        where: {
          id: stopId,
          tenantId: session.user.tenantId,
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
      // Send notification for all stops on route
      stops = await prisma.routeStop.findMany({
        where: {
          routeId,
          tenantId: session.user.tenantId,
          status: 'pending',
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
          case 'on_the_way':
            const eta = new Date(stop.estimatedArrival).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            message = `Your delivery is on the way! Estimated arrival: ${eta}. Driver: ${stop.route.driverName}`;
            break;
          case 'stops_away':
            const remainingStops = await prisma.routeStop.count({
              where: {
                routeId: stop.routeId,
                stopNumber: { lt: stop.stopNumber },
                status: 'pending',
              },
            });
            message = `Your delivery is ${remainingStops} stop${remainingStops !== 1 ? 's' : ''} away!`;
            break;
          case 'arrived':
            message = `Your delivery driver has arrived!`;
            break;
          default:
            message = `Delivery update for your order`;
        }
      }

      // Create portal notification
      const notification = await prisma.portalNotification.create({
        data: {
          tenantId: session.user.tenantId,
          customerId: stop.order.customerId,
          type: 'DELIVERY_UPDATE',
          title: 'Delivery Update',
          message,
          relatedEntityType: 'order',
          relatedEntityId: stop.orderId,
        },
      });

      notifications.push(notification);

      // TODO: In production, also send SMS/email notifications
      // using services like Twilio or SendGrid
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
