import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, session }) => {
    try {
      const { searchParams } = request.nextUrl;
      const code = searchParams.get("code");
      const state = searchParams.get("state"); // "google" or "outlook"
      const error = searchParams.get("error");

      // Handle OAuth error
      if (error) {
        console.error("[CalendarCallback] OAuth error:", error);
        return new NextResponse(
          `<html><body><script>
            window.opener.postMessage({ type: 'calendar-auth-error', error: '${error}' }, '*');
            window.close();
          </script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code || !state) {
        return NextResponse.json(
          { error: "Missing authorization code or state" },
          { status: 400 }
        );
      }

      const origin = request.nextUrl.origin;
      const redirectUri = `${origin}/api/sales/call-plan/carla/calendar/callback`;

      let accessToken: string;
      let refreshToken: string;
      let expiresIn: number;

      // Exchange code for tokens based on provider
      if (state === "google") {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error("[CalendarCallback] Token exchange failed:", errorData);
          throw new Error("Failed to exchange authorization code");
        }

        const tokens = await tokenResponse.json();
        accessToken = tokens.access_token;
        refreshToken = tokens.refresh_token;
        expiresIn = tokens.expires_in;
      } else if (state === "outlook") {
        const tokenResponse = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: process.env.MICROSOFT_CLIENT_ID!,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
              redirect_uri: redirectUri,
              grant_type: "authorization_code",
            }),
          }
        );

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error("[CalendarCallback] Token exchange failed:", errorData);
          throw new Error("Failed to exchange authorization code");
        }

        const tokens = await tokenResponse.json();
        accessToken = tokens.access_token;
        refreshToken = tokens.refresh_token;
        expiresIn = tokens.expires_in;
      } else {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
      }

      // Save tokens to database
      await db.user.update({
        where: { id: session.user.id },
        data: {
          calendarProvider: state,
          calendarAccessToken: accessToken,
          calendarRefreshToken: refreshToken,
          lastCalendarSync: new Date(),
        },
      });

      console.log(`[CalendarCallback] ✅ ${state} calendar connected for user ${session.user.id}`);

      // Close popup and notify parent window
      return new NextResponse(
        `<html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'calendar-auth-success',
                provider: '${state}'
              }, '*');
              window.close();
            </script>
            <p>Calendar connected successfully! This window will close automatically.</p>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (error) {
      console.error("[CalendarCallback] Error:", error);

      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'calendar-auth-error', error: 'Connection failed' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }
  });
}
