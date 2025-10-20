import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies, readSessionCookies } from "@/lib/auth/cookies";
import { withTenantFromRequest } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const { sessionId } = readSessionCookies(request);

  const response = NextResponse.json({ success: true });

  if (!sessionId) {
    clearSessionCookies(response);
    return response;
  }

  try {
    await withTenantFromRequest(request, async (tenantId, db) => {
      await db.portalSession.deleteMany({
        where: {
          id: sessionId,
          tenantId,
        },
      });
      return response;
    });
  } catch (error) {
    console.error("Portal logout failed:", error);
  } finally {
    clearSessionCookies(response);
  }

  return response;
}
