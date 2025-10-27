import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callPlanId, weekStart } = await request.json();

    if (!callPlanId) {
      return NextResponse.json({ error: "Call plan ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        calendarProvider: true,
        calendarAccessToken: true,
      },
    });

    if (!user || !user.calendarAccessToken) {
      return NextResponse.json(
        { error: "Calendar not connected" },
        { status: 400 }
      );
    }

    // Fetch call plan with accounts
    const callPlan = await prisma.weeklyCallPlan.findUnique({
      where: { id: callPlanId },
      include: {
        accounts: {
          include: {
            customer: {
              include: {
                addresses: true,
              },
            },
          },
        },
      },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    let eventCount = 0;

    // Create calendar events based on provider
    if (user.calendarProvider === "google") {
      // Google Calendar API
      for (const planAccount of callPlan.accounts) {
        const customer = planAccount.customer;
        const address = customer.addresses?.[0];

        const event = {
          summary: customer.customerName,
          location: address
            ? `${address.address1}, ${address.city}, ${address.state} ${address.zipCode}`
            : "",
          description: planAccount.objectives || "Call plan visit",
          start: {
            dateTime: new Date(weekStart).toISOString(),
            timeZone: "America/New_York",
          },
          end: {
            dateTime: new Date(
              new Date(weekStart).getTime() + 30 * 60000
            ).toISOString(),
            timeZone: "America/New_York",
          },
        };

        // Call Google Calendar API
        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.calendarAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );

        if (response.ok) {
          eventCount++;
        }
      }
    } else if (user.calendarProvider === "outlook") {
      // Microsoft Graph API
      for (const planAccount of callPlan.accounts) {
        const customer = planAccount.customer;
        const address = customer.addresses?.[0];

        const event = {
          subject: customer.customerName,
          location: {
            displayName: address
              ? `${address.address1}, ${address.city}, ${address.state} ${address.zipCode}`
              : "",
          },
          body: {
            contentType: "HTML",
            content: planAccount.objectives || "Call plan visit",
          },
          start: {
            dateTime: new Date(weekStart).toISOString(),
            timeZone: "Eastern Standard Time",
          },
          end: {
            dateTime: new Date(
              new Date(weekStart).getTime() + 30 * 60000
            ).toISOString(),
            timeZone: "Eastern Standard Time",
          },
        };

        // Call Microsoft Graph API
        const response = await fetch(
          "https://graph.microsoft.com/v1.0/me/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.calendarAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );

        if (response.ok) {
          eventCount++;
        }
      }
    }

    // Update last sync time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastCalendarSync: new Date() },
    });

    return NextResponse.json({ eventCount, success: true });
  } catch (error) {
    console.error("Error syncing calendar:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
