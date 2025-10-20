import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog, calculateChanges } from "@/lib/audit-log";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/sales/admin/orders/[id] - Get single order with details
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId }) => {
    const order = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            salesRep: {
              select: {
                id: true,
                territoryName: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        invoices: {
          include: {
            payments: {
              select: {
                id: true,
                amount: true,
                receivedAt: true,
                method: true,
                reference: true,
              },
            },
          },
        },
        portalUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate invoice totals
    const invoiceInfo = order.invoices[0]
      ? {
          id: order.invoices[0].id,
          invoiceNumber: order.invoices[0].invoiceNumber,
          status: order.invoices[0].status,
          subtotal: order.invoices[0].subtotal ? Number(order.invoices[0].subtotal) : 0,
          total: order.invoices[0].total ? Number(order.invoices[0].total) : 0,
          dueDate: order.invoices[0].dueDate,
          issuedAt: order.invoices[0].issuedAt,
          payments: order.invoices[0].payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            receivedAt: p.receivedAt,
            method: p.method,
            reference: p.reference,
          })),
          paidAmount: order.invoices[0].payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
          ),
          outstandingAmount:
            Number(order.invoices[0].total || 0) -
            order.invoices[0].payments.reduce((sum, p) => sum + Number(p.amount), 0),
        }
      : null;

    // Get audit logs
    const auditLogs = await db.auditLog.findMany({
      where: {
        tenantId,
        entityType: "Order",
        entityId: params.id,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      order: {
        id: order.id,
        customerId: order.customerId,
        status: order.status,
        orderedAt: order.orderedAt,
        fulfilledAt: order.fulfilledAt,
        deliveredAt: order.deliveredAt,
        deliveryWeek: order.deliveryWeek,
        isFirstOrder: order.isFirstOrder,
        total: Number(order.total || 0),
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.customer,
        salesRep: order.customer.salesRep
          ? {
              id: order.customer.salesRep.id,
              name: order.customer.salesRep.user.fullName,
              territory: order.customer.salesRep.territoryName,
            }
          : null,
        lines: order.lines.map((line) => ({
          id: line.id,
          skuId: line.skuId,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          isSample: line.isSample,
          total: line.quantity * Number(line.unitPrice),
          sku: {
            id: line.sku.id,
            code: line.sku.code,
            size: line.sku.size,
            unitOfMeasure: line.sku.unitOfMeasure,
            product: line.sku.product,
          },
        })),
        invoice: invoiceInfo,
        portalUser: order.portalUser,
        auditLogs: auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          changes: log.changes,
          metadata: log.metadata,
          createdAt: log.createdAt,
          user: log.user,
        })),
      },
    });
  });
}

// PUT /api/sales/admin/orders/[id] - Update order
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const {
      customerId,
      orderedAt,
      status,
      deliveryWeek,
      fulfilledAt,
      deliveredAt,
      isFirstOrder,
      currency,
    } = body;

    // Get current order
    const currentOrder = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate customer if changing
    if (customerId && customerId !== currentOrder.customerId) {
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
    }

    // Build update data
    const updateData: any = {};

    if (customerId !== undefined) updateData.customerId = customerId;
    if (orderedAt !== undefined) updateData.orderedAt = new Date(orderedAt);
    if (status !== undefined) updateData.status = status;
    if (deliveryWeek !== undefined) updateData.deliveryWeek = deliveryWeek;
    if (fulfilledAt !== undefined)
      updateData.fulfilledAt = fulfilledAt ? new Date(fulfilledAt) : null;
    if (deliveredAt !== undefined)
      updateData.deliveredAt = deliveredAt ? new Date(deliveredAt) : null;
    if (isFirstOrder !== undefined) updateData.isFirstOrder = isFirstOrder;
    if (currency !== undefined) updateData.currency = currency;

    // If status is changing to FULFILLED, set fulfilledAt if not already set
    if (status === "FULFILLED" && !currentOrder.fulfilledAt && !fulfilledAt) {
      updateData.fulfilledAt = new Date();
    }

    // Calculate changes for audit log
    const changes = calculateChanges(
      {
        customerId: currentOrder.customerId,
        orderedAt: currentOrder.orderedAt,
        status: currentOrder.status,
        deliveryWeek: currentOrder.deliveryWeek,
        fulfilledAt: currentOrder.fulfilledAt,
        deliveredAt: currentOrder.deliveredAt,
        isFirstOrder: currentOrder.isFirstOrder,
        currency: currentOrder.currency,
      },
      {
        customerId: updateData.customerId || currentOrder.customerId,
        orderedAt: updateData.orderedAt || currentOrder.orderedAt,
        status: updateData.status || currentOrder.status,
        deliveryWeek: updateData.deliveryWeek ?? currentOrder.deliveryWeek,
        fulfilledAt: updateData.fulfilledAt ?? currentOrder.fulfilledAt,
        deliveredAt: updateData.deliveredAt ?? currentOrder.deliveredAt,
        isFirstOrder: updateData.isFirstOrder ?? currentOrder.isFirstOrder,
        currency: updateData.currency || currentOrder.currency,
      }
    );

    // Update order in transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: {
          id: params.id,
          tenantId,
        },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              salesRep: {
                select: {
                  id: true,
                  territoryName: true,
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          lines: {
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      // Log update
      if (Object.keys(changes).length > 0) {
        await createAuditLog(tx, {
          tenantId,
          userId: session.user.id,
          entityType: "Order",
          entityId: params.id,
          action: status !== currentOrder.status ? "STATUS_CHANGE" : "UPDATE",
          changes,
        });
      }

      return order;
    });

    return NextResponse.json({
      order: {
        ...updatedOrder,
        total: Number(updatedOrder.total || 0),
        lines: updatedOrder.lines.map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
        })),
        salesRep: updatedOrder.customer.salesRep
          ? {
              id: updatedOrder.customer.salesRep.id,
              name: updatedOrder.customer.salesRep.user.fullName,
              territory: updatedOrder.customer.salesRep.territoryName,
            }
          : null,
      },
    });
  });
}
