import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/audit-log";
import { Prisma } from "@prisma/client";
import { calculateOrderTotal } from "@/lib/orders/calculations";
import { generateOrderNumber } from "@/lib/orders/order-number-generator";

// GET /api/sales/admin/orders - List orders with filters
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Filters
    const statusFilter = searchParams.get("status")?.split(",").filter(Boolean);
    const invoiceStatusFilter = searchParams.get("invoiceStatus")?.split(",").filter(Boolean);
    const salesRepId = searchParams.get("salesRepId");
    const customerId = searchParams.get("customerId");
    const customerSearch = searchParams.get("customerSearch");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");

    // Sorting
    const sortBy = searchParams.get("sortBy") || "orderedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    if (statusFilter?.length) {
      where.status = { in: statusFilter as any[] };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (customerSearch) {
      where.customer = {
        name: {
          contains: customerSearch,
          mode: "insensitive",
        },
      };
    }

    if (salesRepId) {
      where.customer = {
        ...where.customer,
        salesRepId,
      };
    }

    if (dateFrom || dateTo) {
      where.orderedAt = {};
      if (dateFrom) {
        where.orderedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.orderedAt.lte = new Date(dateTo);
      }
    }

    if (minAmount || maxAmount) {
      where.total = {};
      if (minAmount) {
        where.total.gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        where.total.lte = parseFloat(maxAmount);
      }
    }

    // Invoice status filter requires a complex query
    let invoiceStatusWhere: any = undefined;
    if (invoiceStatusFilter?.length) {
      invoiceStatusWhere = {
        some: {
          status: { in: invoiceStatusFilter as any[] },
        },
      };
    }

    // Fetch orders
    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where: {
          ...where,
          ...(invoiceStatusWhere ? { invoices: invoiceStatusWhere } : {}),
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
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          invoices: {
            select: {
              id: true,
              status: true,
              invoiceNumber: true,
              total: true,
              dueDate: true,
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
          lines: {
            select: {
              quantity: true,
              unitPrice: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      }),
      db.order.count({
        where: {
          ...where,
          ...(invoiceStatusWhere ? { invoices: invoiceStatusWhere } : {}),
        },
      }),
    ]);

    // Format response
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderedAt: order.orderedAt,
      status: order.status,
      total: calculateOrderTotal({ total: order.total, lines: order.lines }),
      currency: order.currency,
      deliveryWeek: order.deliveryWeek,
      updatedAt: order.updatedAt,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
      },
      salesRep: order.customer.salesRep
        ? {
            id: order.customer.salesRep.id,
            name: order.customer.salesRep.user.fullName,
            territory: order.customer.salesRep.territoryName,
          }
        : null,
      invoice: order.invoices[0]
        ? {
            id: order.invoices[0].id,
            status: order.invoices[0].status,
            invoiceNumber: order.invoices[0].invoiceNumber,
            total: order.invoices[0].total ? Number(order.invoices[0].total) : 0,
            dueDate: order.invoices[0].dueDate,
          }
        : null,
    }));

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  });
}

// POST /api/sales/admin/orders - Create new order (Sprint 3: Added orderNumber generation)
export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { customerId, orderedAt, status, currency, deliveryWeek, lineItems, notes } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    // Verify all SKUs exist
    const skuIds = lineItems.map((item: any) => item.skuId);
    const skus = await db.sku.findMany({
      where: {
        id: { in: skuIds },
        tenantId,
      },
      include: {
        product: true,
      },
    });

    if (skus.length !== skuIds.length) {
      return NextResponse.json({ error: "One or more SKUs not found" }, { status: 404 });
    }

    // Calculate total
    let total = 0;
    const validatedLineItems = lineItems.map((item: any) => {
      const sku = skus.find((s) => s.id === item.skuId);
      const unitPrice = item.unitPrice || (sku?.pricePerUnit ? Number(sku.pricePerUnit) : 0);
      const lineTotal = item.quantity * unitPrice;
      total += lineTotal;

      return {
        skuId: item.skuId,
        quantity: item.quantity,
        unitPrice,
        isSample: item.isSample || false,
      };
    });

    // Generate order number (Sprint 3 Polish)
    const orderNumber = await generateOrderNumber(db, tenantId, customerId);

    // Create order with line items in a transaction
    const order = await db.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          customerId,
          portalUserId: session.user.id,
          orderNumber,
          status: status || "DRAFT",
          orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
          total,
          currency: currency || "USD",
          deliveryWeek,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
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

      // Create line items
      await tx.orderLine.createMany({
        data: validatedLineItems.map((item) => ({
          tenantId,
          orderId: newOrder.id,
          ...item,
        })),
      });

      // Log creation
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: newOrder.id,
        action: "CREATE",
        metadata: {
          customerName: customer.name,
          total,
          lineItemCount: validatedLineItems.length,
        },
      });

      return newOrder;
    });

    // Fetch the complete order with line items
    const completeOrder = await db.order.findUnique({
      where: { id: order.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
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

    return NextResponse.json({
      order: {
        ...completeOrder,
        total: Number(completeOrder?.total || 0),
        lines: completeOrder?.lines.map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
        })),
      },
    });
  });
}
