import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { getActiveCartWithItems, serializeCart } from "@/lib/cart";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = request.nextUrl.searchParams.get("customerId");

      if (!customerId) {
        return NextResponse.json(
          { error: "customerId query parameter is required." },
          { status: 400 },
        );
      }

      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: session.user.salesRep?.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to this sales rep." },
          { status: 404 },
        );
      }

      // Find or create portal user for the customer
      let portalUser = await db.portalUser.findFirst({
        where: {
          tenantId,
          customerId,
        },
      });

      if (!portalUser) {
        // Create a portal user for this customer so they can have a cart
        // Use upsert to avoid unique constraint errors
        const customer = await db.customer.findUnique({
          where: { id: customerId },
          select: { billingEmail: true, name: true }
        });

        portalUser = await db.portalUser.upsert({
          where: {
            tenantId_email: {
              tenantId,
              email: customer?.billingEmail || `portal-${customerId}@temp.local`
            }
          },
          create: {
            tenantId,
            customerId,
            email: customer?.billingEmail ?? `portal-${customerId}@temp.local`,
            fullName: customer?.name ?? "Unknown",
            status: "ACTIVE",
          },
          update: {
            customerId,
            fullName: customer?.name ?? "Unknown",
            status: "ACTIVE",
          }
        });
      }

      const cart = await getActiveCartWithItems(db, tenantId, portalUser.id);
      if (!cart) {
        return NextResponse.json({ error: "Unable to load cart." }, { status: 500 });
      }

      return NextResponse.json({
        ...serializeCart(cart),
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
        },
      });
    }
  );
}
