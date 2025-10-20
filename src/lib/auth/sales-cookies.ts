import { NextResponse, type NextRequest } from "next/server";

export const SALES_ACCESS_COOKIE = "sales_session_id";
export const SALES_REFRESH_COOKIE = "sales_refresh_token";

const DEFAULT_MAX_AGE_SECONDS = Number(process.env.SALES_SESSION_MAX_AGE ?? 60 * 60 * 24);

export function applySalesSessionCookies(
  response: NextResponse,
  sessionId: string,
  refreshToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(SALES_ACCESS_COOKIE, sessionId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });

  response.cookies.set(SALES_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: maxAgeSeconds * 7,
    path: "/api/sales/auth",
  });
}

export function clearSalesSessionCookies(response: NextResponse) {
  response.cookies.set(SALES_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(SALES_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function readSalesSessionCookies(request: NextRequest) {
  return {
    sessionId: request.cookies.get(SALES_ACCESS_COOKIE)?.value ?? null,
    refreshToken: request.cookies.get(SALES_REFRESH_COOKIE)?.value ?? null,
  };
}
