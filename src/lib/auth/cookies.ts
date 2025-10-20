import { NextResponse, type NextRequest } from "next/server";
import type { PortalSession } from "@prisma/client";

export const ACCESS_COOKIE = "portal_session_id";
export const REFRESH_COOKIE = "portal_refresh_token";

const DEFAULT_MAX_AGE_SECONDS = Number(process.env.PORTAL_SESSION_MAX_AGE ?? 60 * 60 * 24);

export function applySessionCookies(
  response: NextResponse,
  session: PortalSession,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_COOKIE, session.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });

  response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: maxAgeSeconds * 7,
    path: "/api/portal/auth",
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function readSessionCookies(request: NextRequest) {
  return {
    sessionId: request.cookies.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value ?? null,
  };
}
