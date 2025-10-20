import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      try {
        const invoices = await db.invoice.findMany({
          where: buildInvoiceWhere(tenantId, session.portalUser.customerId, session.portalUserId, roles),
          include: {
            order: {
              select: {
                id: true,
                status: true,
                orderedAt: true,
              },
            },
            payments: true,
          },
          orderBy: {
            issuedAt: "desc",
          },
          take: limit,
        });

        return NextResponse.json({
          invoices: invoices.map(serializeInvoice),
        });
      } catch (error) {
        console.error("[api/portal/invoices] Failed to load invoices:", error);
        return NextResponse.json({ error: "Unable to load invoices." }, { status: 500 });
      }
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildInvoiceWhere(
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  roles: string[],
): Prisma.InvoiceWhereInput {
  const base: Prisma.InvoiceWhereInput = {
    tenantId,
  };

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
    order: {
      portalUserId,
    },
  };
}

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    order: {
      select: {
        id: true;
        status: true;
        orderedAt: true;
      };
    };
    payments: true;
  };
}>;

function serializeInvoice(invoice: InvoiceWithRelations) {
  const total = invoice.total ? Number(invoice.total) : 0;
  const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    total,
    balanceDue: Math.max(0, total - paid),
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    order: invoice.order
      ? {
          id: invoice.order.id,
          status: invoice.order.status,
          orderedAt: invoice.order.orderedAt?.toISOString() ?? null,
        }
      : null,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      receivedAt: payment.receivedAt.toISOString(),
    })),
  };
}
