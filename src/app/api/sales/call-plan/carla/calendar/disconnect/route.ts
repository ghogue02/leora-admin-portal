import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, session }) => {
    try {
      await db.user.update({
        where: { id: session.user.id },
        data: {
          calendarProvider: null,
          calendarAccessToken: null,
          calendarRefreshToken: null,
          lastCalendarSync: null,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      return NextResponse.json(
        { error: "Failed to disconnect calendar" },
        { status: 500 },
      );
    }
  });
}
