import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { applySalesSessionCookies } from "@/lib/auth/sales-cookies";
import { createSalesSession } from "@/lib/auth/sales-session";
import { withTenantFromRequest } from "@/lib/tenant";

const SESSION_TTL_MS = Number(process.env.SALES_SESSION_TTL_MS ?? 1000 * 60 * 60 * 24);

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const password = body.password?.trim();
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  try {
    const { result: loginData } = await withTenantFromRequest(request, async (tenantId, db) => {
      // Find user with sales rep profile
      const user = await db.user.findFirst({
        where: {
          tenantId,
          email,
          isActive: true,
        },
        include: {
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("INVALID_CREDENTIALS");
      }

      // Check if user has sales rep profile
      if (!user.salesRepProfile) {
        throw new Error("NO_SALES_REP_PROFILE");
      }

      if (!user.salesRepProfile.isActive) {
        throw new Error("SALES_REP_INACTIVE");
      }

      // Verify password hash
      const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
      if (!isPasswordValid) {
        throw new Error("INVALID_CREDENTIALS");
      }

      const sessionId = randomUUID();
      const refreshToken = randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

      await createSalesSession(
        db,
        tenantId,
        user.id,
        sessionId,
        refreshToken,
        expiresAt,
      );

      // Return data only, not a response object
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          salesRep: {
            id: user.salesRepProfile.id,
            territoryName: user.salesRepProfile.territoryName,
          },
        },
        session: {
          id: sessionId,
          expiresAt: expiresAt.toISOString(),
        },
        sessionId,
        refreshToken,
      };
    });

    // Create response OUTSIDE the wrapper to ensure cookies are set correctly
    const response = NextResponse.json({
      user: loginData.user,
      session: loginData.session,
    });

    // Apply cookies to the final response object
    applySalesSessionCookies(
      response,
      loginData.sessionId,
      loginData.refreshToken,
      Math.floor(SESSION_TTL_MS / 1000)
    );

    // Add debug headers to verify cookie setting
    response.headers.set('X-Debug-Session-ID', loginData.sessionId.substring(0, 12));
    response.headers.set('X-Debug-Cookies-Set', 'true');
    response.headers.set('X-Debug-Secure-Flag', process.env.NODE_ENV === 'production' ? 'true' : 'false');

    console.log('✅ [Login] Cookies applied to response');
    console.log('✅ [Login] Session ID:', loginData.sessionId);
    console.log('✅ [Login] Secure flag:', process.env.NODE_ENV === 'production');
    console.log('✅ [Login] Cookie count:', response.cookies.getAll().length);

    return response;
  } catch (error) {
    console.error("❌ [Login] Failed:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }
      if (error.message === "NO_SALES_REP_PROFILE") {
        return NextResponse.json(
          { error: "User does not have a sales rep profile." },
          { status: 403 }
        );
      }
      if (error.message === "SALES_REP_INACTIVE") {
        return NextResponse.json(
          { error: "Sales rep account is inactive." },
          { status: 403 }
        );
      }
    }

    const message =
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? "Unable to authenticate user."
        : error.message || "Unable to authenticate user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
