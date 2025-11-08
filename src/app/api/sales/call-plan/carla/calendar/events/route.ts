import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { makeGoogleCalendarRequest } from "@/lib/google-calendar";

type GoogleCalendarEvent = {
  id: string;
  summary?: string | null;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string | null;
};

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, session }) => {
    try {
      const { searchParams } = request.nextUrl;
      const weekStartParam = searchParams.get("weekStart");

      if (!weekStartParam) {
        return NextResponse.json({ error: "weekStart required" }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          calendarProvider: true,
          calendarAccessToken: true,
        },
      });

      if (!user?.calendarProvider || !user?.calendarAccessToken) {
        return NextResponse.json(
          { error: "Calendar not connected", events: [] },
          { status: 200 }
        );
      }

      // The client sends Monday as weekStart, use it directly instead of recalculating
      const weekStart = new Date(weekStartParam);
      weekStart.setHours(0, 0, 0, 0);

      // End is Friday (4 days later for work week)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 4);
      weekEnd.setHours(23, 59, 59, 999);

      let googleEvents: GoogleCalendarEvent[] = [];

      console.log("[CalendarEvents] Fetching Google Calendar events", {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        provider: user.calendarProvider,
      });

      if (user.calendarProvider === "google") {
        // Fetch events from Google Calendar for this week
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${weekStart.toISOString()}` +
            `&timeMax=${weekEnd.toISOString()}` +
            `&singleEvents=true` +
            `&orderBy=startTime`;

        console.log("[CalendarEvents] Google API URL:", url);

        try {
          // Use helper that auto-refreshes token if expired
          const response = await makeGoogleCalendarRequest(session.user.id, url, {
            method: "GET",
          });

          console.log("[CalendarEvents] Google API response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            googleEvents = data.items || [];
            console.log("[CalendarEvents] ✅ Fetched", googleEvents.length, "events from Google");
            console.log("[CalendarEvents] Events:", googleEvents.map((e) => ({
              id: e.id,
              summary: e.summary,
              start: e.start,
            })));
          } else {
            const errorText = await response.text();
            console.error("[CalendarEvents] Failed to fetch from Google:", errorText);
          }
        } catch (googleError) {
          console.error("[CalendarEvents] Google calendar fetch failed:", googleError);
          return NextResponse.json(
            {
              events: [],
              error: "google_calendar_disconnected",
              message:
                "Google Calendar access has expired or been revoked. Please reconnect your calendar.",
            },
            { status: 200 }
          );
        }
      }

      // Transform to common format
      const events = googleEvents.map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location,
        source: "google",
        isAllDay: !event.start.dateTime,
      }));

      console.log("[CalendarEvents] ✅ Returning", events.length, "transformed events");

      return NextResponse.json({ events });
    } catch (error) {
      console.error("[CalendarEvents] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch calendar events" },
        { status: 500 }
      );
    }
  });
}
