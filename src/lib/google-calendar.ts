import { prisma } from "@/lib/prisma";

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshGoogleAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      calendarProvider: true,
      calendarAccessToken: true,
      calendarRefreshToken: true,
    },
  });

  if (!user || user.calendarProvider !== "google" || !user.calendarRefreshToken) {
    console.error("[GoogleCalendar] No refresh token available for user", userId);
    return null;
  }

  try {
    console.log("[GoogleCalendar] Refreshing access token...");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.calendarRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[GoogleCalendar] Token refresh failed:", error);
      return null;
    }

    const tokens = await response.json();
    const newAccessToken = tokens.access_token;

    // Update user with new access token
    await prisma.user.update({
      where: { id: userId },
      data: {
        calendarAccessToken: newAccessToken,
      },
    });

    console.log("[GoogleCalendar] ✅ Access token refreshed successfully");

    return newAccessToken;
  } catch (error) {
    console.error("[GoogleCalendar] Error refreshing token:", error);
    return null;
  }
}

/**
 * Make authenticated request to Google Calendar API with automatic token refresh
 */
export async function makeGoogleCalendarRequest(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      calendarAccessToken: true,
      calendarProvider: true,
    },
  });

  if (!user?.calendarAccessToken || user.calendarProvider !== "google") {
    throw new Error("Google Calendar not connected");
  }

  // Try request with current token
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${user.calendarAccessToken}`,
    },
  });

  // If 401, try refreshing token and retry
  if (response.status === 401) {
    console.log("[GoogleCalendar] Token expired, refreshing...");

    const newToken = await refreshGoogleAccessToken(userId);

    if (!newToken) {
      throw new Error("Failed to refresh Google Calendar token");
    }

    // Retry request with new token
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return response;
}
