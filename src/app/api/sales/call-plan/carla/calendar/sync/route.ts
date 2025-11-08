import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { makeGoogleCalendarRequest } from "@/lib/google-calendar";
import { formatUTCDate } from '@/lib/dates';

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const { callPlanId } = await request.json();

      if (!callPlanId) {
        return NextResponse.json({ error: "Call plan ID required" }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          calendarProvider: true,
          calendarAccessToken: true,
        },
      });

      if (!user || user.calendarProvider !== "google" || !user.calendarAccessToken) {
        return NextResponse.json(
          { error: "Calendar not connected" },
          { status: 400 },
        );
      }

      const callPlan = await db.callPlan.findFirst({
        where: {
          id: callPlanId,
          tenantId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!callPlan) {
        return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
      }

      const schedules = await db.callPlanSchedule.findMany({
        where: {
          tenantId,
          callPlanId,
        },
        include: {
          customer: {
            include: {
              addresses: true,
            },
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      });

      if (schedules.length === 0) {
        return NextResponse.json(
          { error: "No scheduled accounts to sync", eventCount: 0 },
          { status: 200 },
        );
      }

      let eventCount = 0;

      for (const schedule of schedules) {
        const customer = schedule.customer;
        const address = customer.addresses?.[0];

        // Format date and time for Google Calendar API
        // Google expects RFC3339 format: "2025-10-28T12:00:00-04:00" for EDT
        const dateStr = formatUTCDate(schedule.scheduledDate); // YYYY-MM-DD in UTC
        const startDateTimeStr = `${dateStr}T${schedule.scheduledTime}:00`;

        // Calculate end time
        const [hours, minutes] = schedule.scheduledTime.split(":").map(Number);
        const endMinutes = hours * 60 + minutes + schedule.duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        const endDateTimeStr = `${dateStr}T${endTimeStr}:00`;

        console.log(`[CalendarSync] Syncing ${customer.name}:`, {
          scheduledDate: dateStr,
          scheduledTime: schedule.scheduledTime,
          startDateTimeStr,
          endDateTimeStr,
        });

        const event = {
          summary: customer.name,
          location: address
            ? `${address.street1}, ${address.city}, ${address.state ?? ""} ${address.postalCode ?? ""}`.trim()
            : "",
          description: `Call plan visit - Territory: ${customer.territory || "N/A"}`,
          start: {
            dateTime: startDateTimeStr,
            timeZone: "America/New_York",
          },
          end: {
            dateTime: endDateTimeStr,
            timeZone: "America/New_York",
          },
        };

        // Check if we already synced this schedule
        if (schedule.googleEventId) {
          // Update existing event with auto-refresh token
          const response = await makeGoogleCalendarRequest(
            user.id,
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${schedule.googleEventId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(event),
            },
          );

          if (response.ok) {
            eventCount += 1;
          } else {
            // Event might have been deleted from Google Calendar, create new one
            const createResponse = await makeGoogleCalendarRequest(
              user.id,
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
              },
            );

            if (createResponse.ok) {
              const newEvent = await createResponse.json();
              // Store the new event ID
              await db.callPlanSchedule.update({
                where: { id: schedule.id },
                data: { googleEventId: newEvent.id },
              });
              eventCount += 1;
            }
          }
        } else {
          // Create new event with auto-refresh token
          const response = await makeGoogleCalendarRequest(
            user.id,
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(event),
            },
          );

          if (response.ok) {
            const createdEvent = await response.json();
            // Store the event ID to prevent future duplicates
            await db.callPlanSchedule.update({
              where: { id: schedule.id },
              data: { googleEventId: createdEvent.id },
            });
            eventCount += 1;
          } else {
            console.error(
              `Failed to create Google Calendar event for ${customer.name}:`,
              await response.text(),
            );
          }
        }
      }

      await db.user.update({
        where: { id: user.id },
        data: { lastCalendarSync: new Date() },
      });

      return NextResponse.json({ eventCount, success: true });
    } catch (error) {
      console.error("Error syncing calendar:", error);
      return NextResponse.json(
        { error: "Failed to sync calendar" },
        { status: 500 },
      );
    }
  });
}
