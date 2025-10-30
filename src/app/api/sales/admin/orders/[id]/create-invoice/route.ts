import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/audit-log";
import { createVAInvoice } from "@/lib/invoices/invoice-data-builder";
import { determineInvoiceFormat } from "@/lib/invoices/format-selector";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/sales/admin/orders/[id]/create-invoice - Create invoice from order
export async function POST(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { dueDate, notes, poNumber, specialInstructions, shippingMethod } = body;

    // Get order
    const order = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        invoices: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if invoice already exists
    if (order.invoices.length > 0) {
      return NextResponse.json(
        { error: "Invoice already exists for this order" },
        { status: 400 }
      );
    }

    // Validate order has a total
    if (!order.total || Number(order.total) <= 0) {
      return NextResponse.json(
        { error: "Order must have a total amount" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Get count of invoices this month to generate sequential number
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyInvoiceCount = await db.invoice.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequenceNumber = String(monthlyInvoiceCount + 1).padStart(4, "0");
    const invoiceNumber = `INV-${year}${month}-${sequenceNumber}`;

    // Calculate due date (default: 30 days from now)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    // Use VA invoice creation service for complete field population
    const invoice = await createVAInvoice({
      orderId: params.id,
      tenantId,
      customerId: order.customerId!,
      poNumber,
      specialInstructions,
      shippingMethod,
    });

    // Create transaction for audit logging
    await db.$transaction(async (tx) => {
      const newInvoice = invoice;

      // Log invoice creation
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Invoice",
        entityId: newInvoice.id,
        action: "CREATE",
        metadata: {
          orderId: params.id,
          invoiceNumber: newInvoice.invoiceNumber,
          formatType: newInvoice.invoiceFormatType,
          total: Number(newInvoice.total),
          totalLiters: newInvoice.totalLiters ? Number(newInvoice.totalLiters) : 0,
          customerName: order.customer.name,
          notes,
        },
      });

      // Also log on the order
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: params.id,
        action: "UPDATE",
        changes: {
          invoice: {
            action: "CREATE",
            invoiceId: newInvoice.id,
            invoiceNumber: newInvoice.invoiceNumber,
            formatType: newInvoice.invoiceFormatType,
          },
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
  });
}
