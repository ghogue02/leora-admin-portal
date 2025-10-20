import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";
import { getActiveCartWithItems, serializeCart } from "@/lib/cart";

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const cart = await getActiveCartWithItems(db, tenantId, session.portalUserId);
      if (!cart) {
        return NextResponse.json({ error: "Unable to load cart." }, { status: 500 });
      }

      return NextResponse.json(serializeCart(cart));
    },
    { requiredPermissions: ["portal.cart.manage"] },
  );
}
