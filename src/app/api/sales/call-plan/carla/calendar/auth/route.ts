import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await request.json();

    if (!["google", "outlook"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    let authUrl: string;

    if (provider === "google") {
      // Google Calendar OAuth
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/sales/call-plan/carla/calendar/callback`;
      const scope = "https://www.googleapis.com/auth/calendar.events";

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${provider}`;
    } else {
      // Microsoft Outlook OAuth
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/sales/call-plan/carla/calendar/callback`;
      const scope = "Calendars.ReadWrite offline_access";

      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${provider}`;
    }

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating calendar auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate calendar authorization" },
      { status: 500 }
    );
  }
}
