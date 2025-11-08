import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";
import type { CustomerRiskStatus, Prisma, PrismaClient } from "@prisma/client";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

const FALLBACK_CADENCE_DAYS = 45;
const GRACE_PERIOD_PERCENT = 0.3;
const MIN_GRACE_DAYS = 7;

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, roles }) => {
      try {
        const segments = request.nextUrl.pathname.split("/").filter(Boolean);
        const customerId = segments.at(-1);

        if (!customerId) {
          return NextResponse.json({ error: "Customer ID missing in path." }, { status: 400 });
        }

        const tenantWide = hasTenantWideScope(roles);

        const customer = await db.customer.findFirst({
          where: {
            tenantId,
            id: customerId,
          },
          select: {
            id: true,
            name: true,
            accountNumber: true,
            billingEmail: true,
            phone: true,
            street1: true,
            street2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            paymentTerms: true,
            licenseNumber: true,
            deliveryInstructions: true,
            deliveryMethod: true,
            paymentMethod: true,
            defaultWarehouseLocation: true,
            deliveryWindows: true,
            orderingPaceDays: true,
            establishedRevenue: true,
            contactName: true,
            createdAt: true,
            updatedAt: true,
            riskStatus: true,
            lastOrderDate: true,
            nextExpectedOrderDate: true,
            dormancySince: true,
            addresses: {
              select: {
                id: true,
                label: true,
                street1: true,
                street2: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                isDefault: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
            portalUsers: {
              select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                lastLoginAt: true,
              },
            },
            contacts: {
              select: {
                id: true,
                fullName: true,
                role: true,
                phone: true,
                mobile: true,
                email: true,
                notes: true,
                businessCardUrl: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

        if (!customer) {
          return NextResponse.json({ error: "Customer not found." }, { status: 404 });
        }

        const stats =
          tenantWide
            ? await buildTenantWideStats(db, tenantId, customer.id)
            : buildScopedStats();

        const [recentOrders, recentInvoices, recentActivities] = tenantWide
          ? await Promise.all([
              db.order.findMany({
                where: {
                  tenantId,
                  customerId: customer.id,
                },
                select: {
                  id: true,
                  status: true,
                  orderedAt: true,
                  total: true,
                  currency: true,
                  invoices: {
                    select: { total: true },
                  },
                },
                orderBy: { orderedAt: "desc" },
                take: 8,
              }),
              db.invoice.findMany({
                where: {
                  tenantId,
                  customerId: customer.id,
                },
                include: {
                  payments: true,
                  order: {
                    select: { id: true, status: true },
                  },
                },
                orderBy: { issuedAt: "desc" },
                take: 8,
              }),
              db.activity.findMany({
                where: {
                  tenantId,
                  customerId: customer.id,
                },
                select: {
                  id: true,
                  subject: true,
                  notes: true,
                  occurredAt: true,
                },
                orderBy: { occurredAt: "desc" },
                take: 6,
              }),
            ])
          : [[], [], []];

        return NextResponse.json({
          customer: {
            id: customer.id,
            name: customer.name,
            accountNumber: customer.accountNumber,
            billingEmail: customer.billingEmail,
            phone: customer.phone,
            street1: customer.street1,
            street2: customer.street2,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
            country: customer.country,
            paymentTerms: customer.paymentTerms,
            licenseNumber: customer.licenseNumber,
            deliveryInstructions: customer.deliveryInstructions,
            deliveryMethod: customer.deliveryMethod,
            paymentMethod: customer.paymentMethod,
            defaultWarehouseLocation: customer.defaultWarehouseLocation,
            deliveryWindows: Array.isArray(customer.deliveryWindows) ? customer.deliveryWindows : [],
            orderingPaceDays: customer.orderingPaceDays,
            establishedRevenue: customer.establishedRevenue ? Number(customer.establishedRevenue) : null,
            contactName: customer.contactName,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
            lastOrderDate: customer.lastOrderDate?.toISOString() ?? null,
            nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() ?? null,
            riskStatus: customer.riskStatus,
            dormancySince: customer.dormancySince?.toISOString() ?? null,
            healthSummary: buildHealthSummary(customer),
            stats,
            addresses: customer.addresses.map((address) => ({
              id: address.id,
              label: address.label,
              street1: address.street1,
              street2: address.street2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
              isDefault: address.isDefault,
            })),
            portalUsers: customer.portalUsers.map((user) => ({
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              status: user.status,
              lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            })),
            contacts: customer.contacts.map((contact) => ({
              id: contact.id,
              fullName: contact.fullName,
              role: contact.role,
              phone: contact.phone,
              mobile: contact.mobile,
              email: contact.email,
              notes: contact.notes,
              businessCardUrl: contact.businessCardUrl,
              createdAt: contact.createdAt?.toISOString() ?? new Date().toISOString(),
            })),
            recentOrders: recentOrders.map((order) => ({
              id: order.id,
              status: order.status,
              orderedAt: order.orderedAt?.toISOString() ?? null,
              total: order.total ? Number(order.total) : null,
              currency: order.currency ?? "USD",
              invoiceTotal: order.invoices.reduce(
                (sum, invoice) => sum + Number(invoice.total ?? 0),
                0,
              ),
            })),
            recentInvoices: recentInvoices.map((invoice) => {
              const total = Number(invoice.total ?? 0);
              const paid = invoice.payments.reduce(
                (sum, payment) => sum + Number(payment.amount ?? 0),
                0,
              );
              return {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                total,
                balanceDue: Math.max(0, total - paid),
                issuedAt: invoice.issuedAt?.toISOString() ?? null,
                dueDate: invoice.dueDate?.toISOString() ?? null,
                orderId: invoice.order?.id ?? null,
              };
            }),
            recentActivities: recentActivities.map((activity) => ({
              id: activity.id,
              subject: activity.subject,
              notes: activity.notes,
              occurredAt: activity.occurredAt?.toISOString() ?? null,
            })),
          },
        });
      } catch (error) {
        console.error("[api/portal/customers] Failed to load customer detail:", error);
        return NextResponse.json({ error: "Unable to load customer details." }, { status: 500 });
      }
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

async function buildTenantWideStats(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  customerId: string,
) {
  const orderAggregate = await db.order.aggregate({
    where: {
      tenantId,
      customerId,
    },
    _count: {
      _all: true,
    },
    _sum: {
      total: true,
    },
    _max: {
      orderedAt: true,
    },
  });

  const openOrdersAggregate = await db.order.aggregate({
    where: {
      tenantId,
      customerId,
      status: {
        in: ["SUBMITTED", "PARTIALLY_FULFILLED"],
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      total: true,
    },
  });

  const invoiceAggregate = await db.invoice.aggregate({
    where: {
      tenantId,
      customerId,
    },
    _count: {
      _all: true,
    },
    _sum: {
      total: true,
    },
    _max: {
      issuedAt: true,
    },
  });

  const paymentAggregate = await db.payment.aggregate({
    where: {
      tenantId,
      invoice: {
        customerId,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totalOrders = orderAggregate._count._all ?? 0;
  const orderRevenue = Number(orderAggregate._sum.total ?? 0);
  const lastOrderAt = orderAggregate._max.orderedAt?.toISOString() ?? null;

  const openExposureValue = Number(openOrdersAggregate._sum.total ?? 0);
  const openOrderCount = openOrdersAggregate._count._all ?? 0;

  const invoiceCount = invoiceAggregate._count._all ?? 0;
  const totalInvoiced = Number(invoiceAggregate._sum.total ?? 0);
  const lastInvoiceAt = invoiceAggregate._max.issuedAt?.toISOString() ?? null;

  const totalPayments = Number(paymentAggregate._sum.amount ?? 0);
  const outstandingBalance = Math.max(0, totalInvoiced - totalPayments);
  const averageOrderValue = totalOrders > 0 ? orderRevenue / totalOrders : 0;

  return {
    totalOrders,
    totalRevenue: orderRevenue,
    openExposure: openExposureValue,
    openOrderCount,
    outstandingBalance,
    averageOrderValue,
    totalInvoiced,
    totalPayments,
    lastOrderAt,
    lastInvoiceAt,
    invoiceCount,
  };
}

function buildScopedStats() {
  return {
    totalOrders: 0,
    totalRevenue: 0,
    openExposure: 0,
    openOrderCount: 0,
    outstandingBalance: 0,
    averageOrderValue: 0,
    totalInvoiced: 0,
    totalPayments: 0,
    lastOrderAt: null,
    lastInvoiceAt: null,
    invoiceCount: 0,
  };
}

type CustomerForHealth = {
  riskStatus: CustomerRiskStatus;
  orderingPaceDays: number | null;
  lastOrderDate: Date | null;
  nextExpectedOrderDate: Date | null;
  dormancySince: Date | null;
};

function buildHealthSummary(customer: CustomerForHealth) {
  const lastOrderDate = customer.lastOrderDate ?? null;
  const cadenceBaseline = Math.max(
    customer.orderingPaceDays ?? FALLBACK_CADENCE_DAYS,
    FALLBACK_CADENCE_DAYS,
  );
  const graceDays = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
  const dormantThreshold = cadenceBaseline + graceDays;
  const daysSinceLastOrder = lastOrderDate ? differenceInDays(new Date(), lastOrderDate) : null;

  return {
    riskStatus: customer.riskStatus,
    cadenceBaselineDays: cadenceBaseline,
    graceDays,
    dormantThresholdDays: dormantThreshold,
    daysSinceLastOrder,
    lastOrderDate: lastOrderDate?.toISOString() ?? null,
    nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() ?? null,
    dormancySince: customer.dormancySince?.toISOString() ?? null,
    explanation: buildHealthExplanation({
      riskStatus: customer.riskStatus,
      cadenceBaseline,
      graceDays,
      daysSinceLastOrder,
      dormantThreshold,
      lastOrderDate,
    }),
  };
}

function buildHealthExplanation({
  riskStatus,
  cadenceBaseline,
  graceDays,
  daysSinceLastOrder,
  dormantThreshold,
  lastOrderDate,
}: {
  riskStatus: CustomerRiskStatus;
  cadenceBaseline: number;
  graceDays: number;
  daysSinceLastOrder: number | null;
  dormantThreshold: number;
  lastOrderDate: Date | null;
}) {
  if (!lastOrderDate) {
    if (riskStatus === "DORMANT") {
      return "Dormant because no delivered orders have been recorded yet.";
    }
    return "No delivered orders recorded yet. Once the first order is delivered we'll start tracking cadence.";
  }

  if (daysSinceLastOrder == null) {
    return "Unable to calculate order cadence.";
  }

  const cadenceLabel = `${cadenceBaseline} day cadence`;
  const daysLabel = `${daysSinceLastOrder} days since last delivery`;

  if (riskStatus === "DORMANT") {
    return `Dormant: expected on a ${cadenceLabel} with a ${graceDays}-day grace window, but it's been ${daysLabel}.`;
  }

  if (riskStatus === "AT_RISK_CADENCE") {
    return `At risk: ${daysLabel} versus the ${cadenceLabel}. Reach out before it passes the ${dormantThreshold}-day dormant threshold.`;
  }

  return `Healthy: last delivered ${daysLabel}, within the ${cadenceLabel} (grace ${graceDays} days).`;
}

function differenceInDays(later: Date, earlier: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((later.getTime() - earlier.getTime()) / msPerDay);
}
