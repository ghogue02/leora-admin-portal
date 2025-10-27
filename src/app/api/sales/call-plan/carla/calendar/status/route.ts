import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        calendarProvider: true,
        calendarAccessToken: true,
        calendarRefreshToken: true,
        lastCalendarSync: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isConnected = !!(user.calendarProvider && user.calendarAccessToken);

    return NextResponse.json({
      isConnected,
      provider: user.calendarProvider || null,
      lastSync: user.lastCalendarSync?.toISOString() || null,
      syncedEvents: 0, // TODO: Track synced events count
    });
  } catch (error) {
    console.error("Error fetching calendar status:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar status" },
      { status: 500 }
    );
  }
}
