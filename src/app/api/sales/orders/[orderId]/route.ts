/**
 * Sales Rep Order Detail API
 * GET /api/sales/orders/[orderId]
 *
 * Allows sales reps to view order details for their assigned customers.
 * Uses SAFE pattern with withSalesSession wrapper.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  const orderId = params.orderId;

  return withSalesSession(request, async ({ db, tenantId, session }) => {
    // 1. Validate sales rep exists
    const salesRepId = session.user.salesRep?.id;
    if (!salesRepId) {
      return NextResponse.json(
        { error: 'Sales rep profile required' },
        { status: 403 }
      );
    }

    // 2. Get order with customer validation
    // SECURITY: Only return orders where the customer is assigned to this sales rep
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        customer: {
          salesRepId, // ✅ This ensures the sales rep owns the customer
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            state: true,
            city: true,
            street1: true,
            street2: true,
            postalCode: true,
            phone: true,
            billingEmail: true,
            paymentTerms: true,
            licenseNumber: true,
            licenseType: true,
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
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
            issuedAt: true,
            invoiceFormatType: true,
          },
        },
      },
    });

    // 3. If order not found or not owned by sales rep, return 404
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or you don\'t have access to this order.' },
        { status: 404 }
      );
    }

    // 4. Return order with serialized decimals
    return NextResponse.json({
      order: {
        ...order,
        total: order.total ? Number(order.total) : null,
        lines: order.lines.map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
          total: Number(line.unitPrice) * line.quantity,
          casesQuantity: line.casesQuantity ? Number(line.casesQuantity) : null,
          totalLiters: line.totalLiters ? Number(line.totalLiters) : null,
        })),
        invoices: order.invoices.map((invoice) => ({
          ...invoice,
          total: invoice.total ? Number(invoice.total) : null,
        })),
      },
    });
  });
}

/**
 * PUT /api/sales/orders/[orderId]
 *
 * Phase 3 Sprint 1: Edit Order After Invoice
 *
 * Allows sales reps to update existing orders.
 * If the order has an invoice, it will be regenerated with the new data.
 */
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  const orderId = params.orderId;

  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { createAuditLog } = await import('@/lib/audit-log');
    const { runWithTransaction } = await import('@/lib/prisma');

    // 1. Validate sales rep exists
    const salesRepId = session.user.salesRep?.id;
    if (!salesRepId) {
      return NextResponse.json(
        { error: 'Sales rep profile required' },
        { status: 403 }
      );
    }

    // 2. Get request body
    const body = await request.json();
    const {
      deliveryDate,
      warehouseLocation,
      deliveryTimeWindow,
      poNumber,
      specialInstructions,
      items, // Array of { skuId, quantity }
    } = body;

    // 3. Validate order exists and sales rep has access
    const existingOrder = await db.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        customer: {
          salesRepId, // SECURITY: Ensure sales rep owns customer
        },
      },
      include: {
        customer: true,
        lines: true,
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or you don\'t have access to this order.' },
        { status: 404 }
      );
    }

    // 4. Track changes for audit log
    const changes: any = {
      before: {},
      after: {},
    };

    if (deliveryDate !== existingOrder.deliveryDate?.toISOString().split('T')[0]) {
      changes.before.deliveryDate = existingOrder.deliveryDate;
      changes.after.deliveryDate = deliveryDate;
    }

    if (warehouseLocation !== existingOrder.warehouseLocation) {
      changes.before.warehouseLocation = existingOrder.warehouseLocation;
      changes.after.warehouseLocation = warehouseLocation;
    }

    // 5. Update order and order lines in transaction
    const result = await runWithTransaction(db, async (tx) => {
      // Get SKU details with pricing for line items
      const skuIds = items.map((item: any) => item.skuId);
      const skus = await tx.sku.findMany({
        where: {
          id: { in: skuIds },
          tenantId,
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
            },
          },
          priceLists: {
            include: {
              priceList: true,
            },
          },
        },
      });

      // Apply pricing rules to each item
      const pricedItems = await Promise.all(
        items.map(async (item: any) => {
          const sku = skus.find(s => s.id === item.skuId);
          if (!sku) {
            throw new Error(`SKU ${item.skuId} not found`);
          }

          // Use the price provided in the request (already calculated on frontend)
          return {
            skuId: sku.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,  // Already calculated on frontend
            priceOverridden: item.priceOverridden || false,
            overridePrice: item.overridePrice,
            overrideReason: item.overrideReason,
            overriddenBy: item.priceOverridden ? session.user.id : null,
            overriddenAt: item.priceOverridden ? new Date() : null,
          };
        })
      );

      // Calculate new total
      const newTotal = pricedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      // Update order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          warehouseLocation,
          deliveryTimeWindow,
          poNumber: poNumber || null,
          specialInstructions: specialInstructions || null,
          total: newTotal,
          updatedAt: new Date(),
        },
      });

      // Delete existing order lines
      await tx.orderLine.deleteMany({
        where: { orderId },
      });

      // Create new order lines
      await tx.orderLine.createMany({
        data: pricedItems.map(item => ({
          tenantId,
          orderId,
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          appliedPricingRules: item.appliedPricingRules,
        })),
      });

      // Create audit log for order edit
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: 'Order',
        entityId: orderId,
        action: 'ORDER_EDITED_POST_INVOICE',
        changes: {
          ...changes,
          itemsChanged: true,
          previousLineCount: existingOrder.lines.length,
          newLineCount: pricedItems.length,
          previousTotal: Number(existingOrder.total || 0),
          newTotal: newTotal,
        },
        metadata: {
          editedBy: session.user.fullName,
          salesRepId,
          hasInvoice: existingOrder.invoices.length > 0,
          invoiceNumber: existingOrder.invoices[0]?.invoiceNumber,
        },
      });

      return {
        order: updatedOrder,
        hasInvoice: existingOrder.invoices.length > 0,
        invoiceId: existingOrder.invoices[0]?.id,
      };
    });

    // 6. Trigger invoice regeneration if order has invoice
    let invoiceRegenerated = false;
    if (result.hasInvoice && result.invoiceId) {
      try {
        // Call invoice regeneration endpoint internally
        const regenerateResponse = await fetch(
          `${request.nextUrl.origin}/api/invoices/${result.invoiceId}/regenerate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
            },
          }
        );

        if (regenerateResponse.ok) {
          invoiceRegenerated = true;
        }
      } catch (error) {
        console.error('Invoice regeneration failed:', error);
        // Don't fail the order update if invoice regeneration fails
      }
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      order: {
        ...result.order,
        total: Number(result.order.total || 0),
      },
      invoiceRegenerated,
      message: invoiceRegenerated
        ? 'Order updated and invoice regenerated successfully'
        : 'Order updated successfully',
    });
  });
}
