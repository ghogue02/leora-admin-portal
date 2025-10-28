import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async () => {
    try {
      const { provider } = await request.json();

      if (provider !== "google") {
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
      }

      const origin = request.nextUrl.origin;
      const fallbackOrigin =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";
      const baseUrl = origin || fallbackOrigin;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${baseUrl}/api/sales/call-plan/carla/calendar/callback`;
      const scope = "https://www.googleapis.com/auth/calendar.events";

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${provider}`;

      return NextResponse.json({ authUrl });
    } catch (error) {
      console.error("Error initiating calendar auth:", error);
      return NextResponse.json(
        { error: "Failed to initiate calendar authorization" },
        { status: 500 },
      );
    }
  });
}
