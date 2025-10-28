import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  console.log("[CalendarStatus] Handler invoked");
  return withSalesSession(request, async ({ db, session }) => {
    console.log("[CalendarStatus] withSalesSession resolved", {
      userId: session.user.id,
    });

    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          calendarProvider: true,
          calendarAccessToken: true,
          calendarRefreshToken: true,
          lastCalendarSync: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (user.calendarProvider !== "google" || !user.calendarAccessToken) {
        return NextResponse.json({
          isConnected: false,
          provider: null,
          lastSync: null,
          syncedEvents: 0,
        });
      }

      return NextResponse.json({
        isConnected: true,
        provider: user.calendarProvider,
        lastSync: user.lastCalendarSync?.toISOString() ?? null,
        syncedEvents: 0,
      });
    } catch (error) {
      console.error("[CalendarStatus] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch calendar status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  });
}
