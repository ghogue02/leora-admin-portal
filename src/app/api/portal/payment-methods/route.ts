import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = session.portalUser.customerId;

      if (!customerId) {
        return NextResponse.json({ paymentMethods: [] });
      }

      const terms = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
          paymentTerms: true,
        },
      });

      const cards = await db.portalPaymentMethod.findMany({
        where: {
          tenantId,
          customerId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        terms: terms?.paymentTerms ?? null,
        cards: cards.map((card) => ({
          id: card.id,
          brand: card.brand,
          last4: card.last4,
          expMonth: card.expMonth,
          expYear: card.expYear,
          isDefault: card.isDefault,
          createdAt: card.createdAt,
        })),
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

type PaymentMethodPayload = {
  token?: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
};

export async function POST(request: NextRequest) {
  let payload: PaymentMethodPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { token, brand, last4, expMonth, expYear, isDefault } = payload;

  if (!token || !brand || !last4 || !expMonth || !expYear) {
    return NextResponse.json(
      { error: "token, brand, last4, expMonth, and expYear are required." },
      { status: 400 },
    );
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ error: "Customer context required." }, { status: 400 });
      }

      if (isDefault) {
        await db.portalPaymentMethod.updateMany({
          where: {
            tenantId,
            customerId: session.portalUser.customerId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const paymentMethod = await db.portalPaymentMethod.create({
        data: {
          tenantId,
          customerId: session.portalUser.customerId,
          brand,
          last4,
          expMonth,
          expYear,
          isDefault: Boolean(isDefault),
          token,
        } as Prisma.PortalPaymentMethodCreateInput,
      });

      return NextResponse.json(
        {
          paymentMethod,
        },
        { status: 201 },
      );
    },
    { requiredPermissions: ["portal.orders.write"] },
  );
}
