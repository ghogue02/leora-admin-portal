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
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
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
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Check if user has sales rep profile
      if (!user.salesRepProfile) {
        return NextResponse.json(
          { error: "User does not have a sales rep profile." },
          { status: 403 },
        );
      }

      if (!user.salesRepProfile.isActive) {
        return NextResponse.json(
          { error: "Sales rep account is inactive." },
          { status: 403 },
        );
      }

      // Verify password hash
      const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      const sessionId = randomUUID();
      const refreshToken = randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

      const session = await createSalesSession(
        db,
        tenantId,
        user.id,
        sessionId,
        refreshToken,
        expiresAt,
      );

      const response = NextResponse.json({
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
      });

      applySalesSessionCookies(response, sessionId, refreshToken, Math.floor(SESSION_TTL_MS / 1000));
      return response;
    });

    return result;
  } catch (error) {
    console.error("Sales login failed:", error);
    const message =
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? "Unable to authenticate user."
        : error.message || "Unable to authenticate user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
