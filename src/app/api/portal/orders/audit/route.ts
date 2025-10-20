import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const orders = await db.order.findMany({
        where: buildOrderWhere(tenantId, session.portalUser.customerId, session.portalUserId, roles),
        select: {
          id: true,
          status: true,
          orderedAt: true,
          lines: {
            select: {
              id: true,
              skuId: true,
              quantity: true,
              appliedPricingRules: true,
            },
          },
        },
        orderBy: {
          orderedAt: "desc",
        },
        take: limit,
      });

      const result = orders.map((order) => ({
        id: order.id,
        status: order.status,
        orderedAt: order.orderedAt?.toISOString() ?? null,
        lines: order.lines.map((line) => ({
          id: line.id,
          skuId: line.skuId,
          quantity: line.quantity,
          pricing: line.appliedPricingRules,
        })),
      }));

      return NextResponse.json({ orders: result });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildOrderWhere(tenantId: string, customerId: string | null, portalUserId: string, roles: string[]) {
  const base = {
    tenantId,
  } as const;

  if (hasTenantWideScope(roles)) {
    return base;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    };
  }

  return {
    ...base,
    portalUserId,
  };
}
