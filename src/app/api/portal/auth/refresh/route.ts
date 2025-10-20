import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applySessionCookies, readSessionCookies } from "@/lib/auth/cookies";
import { getActivePortalSession } from "@/lib/auth/session";
import { withTenantFromRequest } from "@/lib/tenant";

const SESSION_TTL_MS = Number(process.env.PORTAL_SESSION_TTL_MS ?? 1000 * 60 * 60 * 24);

export async function POST(request: NextRequest) {
  const { sessionId, refreshToken } = readSessionCookies(request);

  if (!sessionId || !refreshToken) {
    return NextResponse.json({ error: "Refresh credentials missing." }, { status: 401 });
  }

  try {
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
      const session = await getActivePortalSession(db, tenantId, sessionId);

      if (!session || session.refreshToken !== refreshToken) {
        return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
      }

      const updatedSession = await db.portalSession.update({
        where: { id: session.id },
        data: {
          refreshToken: randomUUID(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      });

      const response = NextResponse.json({
        session: {
          id: updatedSession.id,
          expiresAt: updatedSession.expiresAt.toISOString(),
        },
      });

      applySessionCookies(response, updatedSession, Math.floor(SESSION_TTL_MS / 1000));
      return response;
    });

    return result;
  } catch (error) {
    console.error("Portal session refresh failed:", error);
    return NextResponse.json({ error: "Unable to refresh session." }, { status: 500 });
  }
}
