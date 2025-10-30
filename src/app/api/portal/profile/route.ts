import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

type ProfileUpdatePayload = {
  fullName?: string;
};

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, session, tenantId }) => {
      const portalUser = await db.portalUser.findUnique({
        where: {
          id: session.portalUserId,
          tenantId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              paymentTerms: true,
            },
          },
        },
      });

      if (!portalUser) {
        return NextResponse.json({ error: "Portal user not found." }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: portalUser.id,
          email: portalUser.email,
          fullName: portalUser.fullName,
          status: portalUser.status,
          lastLoginAt: portalUser.lastLoginAt,
          createdAt: portalUser.createdAt,
          updatedAt: portalUser.updatedAt,
        },
        customer: portalUser.customer
          ? {
              id: portalUser.customer.id,
              name: portalUser.customer.name,
              paymentTerms: portalUser.customer.paymentTerms,
            }
          : null,
      });
    },
    { requiredPermissions: ["portal.dashboard.view"] },
  );
}

export async function PATCH(request: NextRequest) {
  let payload: ProfileUpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fullName = payload.fullName?.trim();

  if (!fullName) {
    return NextResponse.json({ error: "fullName is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, session, tenantId }) => {
      const updated = await db.portalUser.update({
        where: {
          id: session.portalUserId,
          tenantId,
        },
        data: {
          fullName,
        },
      });

      return NextResponse.json({
        user: {
          id: updated.id,
          email: updated.email,
          fullName: updated.fullName,
          status: updated.status,
          lastLoginAt: updated.lastLoginAt,
          updatedAt: updated.updatedAt,
        },
      });
    },
    { requiredPermissions: ["portal.dashboard.view"] },
  );
}
