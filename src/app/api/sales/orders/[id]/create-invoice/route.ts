/**
 * Sales Rep Invoice Creation API
 *
 * POST /api/sales/orders/[id]/create-invoice
 *
 * Allows sales reps to create invoices for orders of their assigned customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createVAInvoice } from '@/lib/invoices/invoice-data-builder';
import { createAuditLog } from '@/lib/audit-log';
import { getServerSession } from '@/lib/auth/session';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session
    const session = await getServerSession(request);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const tenantId = session.user.tenantId;

    // Get sales rep profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { salesRepProfile: true },
    });

    if (!user?.salesRepProfile) {
      return NextResponse.json(
        { error: 'Sales rep profile not found' },
        { status: 403 }
      );
    }

    const salesRepId = user.salesRepProfile.id;

    // Get order and validate access
    const order = await prisma.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        customer: true,
        invoices: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Security check: Order customer must be assigned to this sales rep
    if (order.customer.salesRepId !== salesRepId) {
      return NextResponse.json(
        { error: 'You can only create invoices for your assigned customers' },
        { status: 403 }
      );
    }

    // Check if invoice already exists
    if (order.invoices.length > 0) {
      return NextResponse.json(
        { error: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }

    // Validate order has a total
    if (!order.total || Number(order.total) <= 0) {
      return NextResponse.json(
        { error: 'Order must have a total amount' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { poNumber, specialInstructions, shippingMethod } = body;

    // Create invoice using VA invoice service
    const invoice = await createVAInvoice({
      orderId: params.id,
      tenantId,
      customerId: order.customerId!,
      poNumber,
      specialInstructions,
      shippingMethod,
    });

    // Create audit log
    await prisma.$transaction(async (tx) => {
      await createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'CREATE',
        metadata: {
          orderId: params.id,
          invoiceNumber: invoice.invoiceNumber,
          formatType: invoice.invoiceFormatType,
          total: Number(invoice.total),
          totalLiters: invoice.totalLiters ? Number(invoice.totalLiters) : 0,
          customerName: order.customer.name,
          createdBy: 'SALES_REP',
        },
      });
    });

    return NextResponse.json({
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal || 0),
        total: Number(invoice.total || 0),
      },
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      {
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
