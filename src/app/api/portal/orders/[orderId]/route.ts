import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const segments = request.nextUrl.pathname.split("/").filter(Boolean);
      const orderId = segments[segments.length - 1];

      if (!orderId) {
        return NextResponse.json({ error: "Order ID missing in path." }, { status: 400 });
      }

      const order = (await db.order.findFirst({
        where: buildOrderWhere(tenantId, session.portalUser.customerId, session.portalUserId, orderId, roles),
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          lines: {
            select: {
              id: true,
              skuId: true,
              quantity: true,
              unitPrice: true,
              isSample: true,
              appliedPricingRules: true,
              sku: {
                select: {
                  id: true,
                  code: true,
                  size: true,
                  unitOfMeasure: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      brand: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
          invoices: {
            include: {
              payments: true,
            },
            orderBy: {
              issuedAt: "desc",
            },
          },
        },
      })) as OrderWithRelations | null;

      if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      return NextResponse.json({ order: serializeOrder(order) });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildOrderWhere(
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  orderId: string,
  roles: string[],
): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = {
    tenantId,
    id: orderId,
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
    portalUserId,
  };
}

type OrderLineWithPricing = {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  isSample: boolean;
  appliedPricingRules: unknown;
  sku: {
    id: string;
    code: string;
    size: string | null;
    unitOfMeasure: string | null;
    product: {
      id: string;
      name: string;
      brand: string | null;
      category: string | null;
    };
  };
};

type InvoiceWithPayments = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  total: Prisma.Decimal | null;
  issuedAt: Date | null;
  dueDate: Date | null;
  payments: Array<{
    id: string;
    amount: Prisma.Decimal;
    method: string;
    reference: string | null;
    receivedAt: Date;
  }>;
};

type OrderWithRelations = {
  id: string;
  status: string;
  orderedAt: Date | null;
  fulfilledAt: Date | null;
  currency: string;
  total: Prisma.Decimal | null;
  customer: {
    id: string;
    name: string;
  } | null;
  lines: OrderLineWithPricing[];
  invoices: InvoiceWithPayments[];
};

type PricingRule = {
  source?: string;
  priceListId?: string | null;
  priceListName?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  resolvedAt?: string;
  allocations?: Array<{
    inventoryId: string;
    location: string;
    quantity: number;
  }>;
};

function serializeOrder(order: OrderWithRelations) {
  const lines = order.lines.map((line) => {
    const unitPrice = Number(line.unitPrice);
    const lineTotal = unitPrice * line.quantity;
    const pricingRules = (line.appliedPricingRules as PricingRule | null) ?? null;
    return {
      id: line.id,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      isSample: Boolean(line.isSample),
      pricing: pricingRules
        ? {
            source: pricingRules.source ?? "unknown",
            priceListName: pricingRules.priceListName ?? null,
            minQuantity: pricingRules.minQuantity ?? null,
            maxQuantity: pricingRules.maxQuantity ?? null,
            allocations: pricingRules.allocations ?? [],
          }
        : null,
      sku: {
        id: line.sku.id,
        code: line.sku.code,
        size: line.sku.size,
        unitOfMeasure: line.sku.unitOfMeasure,
        product: line.sku.product,
      },
    };
  });

  const invoices = order.invoices.map((invoice) => {
    const total = invoice.total ? Number(invoice.total) : 0;
    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      balanceDue: Math.max(0, total - paid),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference,
        receivedAt: payment.receivedAt.toISOString(),
      })),
    };
  });

  return {
    id: order.id,
    status: order.status,
    orderedAt: order.orderedAt?.toISOString() ?? null,
    fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    currency: order.currency,
    total: order.total ? Number(order.total) : null,
    customer: order.customer,
    lines,
    invoices,
  };
}
