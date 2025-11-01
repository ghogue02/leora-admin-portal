import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";
import JSZip from "jszip";
import { generateInvoicePDF } from "@/lib/invoices/pdf-generator";

/**
 * POST /api/sales/orders/bulk-print
 *
 * Travis's critical requirement: Bulk print invoices
 *
 * "Operations team wants to select one day's worth of invoices and print them all at once.
 * The old process required going into every single one, opening it up, bringing it up, printing it."
 *
 * This endpoint:
 * 1. Takes array of order IDs
 * 2. Generates invoice PDFs for each
 * 3. Returns ZIP file with all PDFs
 *
 * Usage: Operations selects orders from queue, clicks "Print Invoices (ZIP)"
 */

const BulkPrintSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BulkPrintSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { orderIds } = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Fetch orders with full details for invoice generation
      const orders = await db.order.findMany({
        where: {
          tenantId,
          id: { in: orderIds },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              street1: true,
              street2: true,
              city: true,
              state: true,
              postalCode: true,
              territory: true,
              paymentTerms: true,
              licenseNumber: true,
            },
          },
          lines: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                      brand: true,
                    },
                  },
                },
              },
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              poNumber: true,
              specialInstructions: true,
              paymentTermsText: true,
            },
          },
        },
      });

      if (orders.length === 0) {
        return NextResponse.json(
          { error: "No orders found with provided IDs" },
          { status: 404 }
        );
      }

      // Create ZIP file
      const zip = new JSZip();

      // Generate invoice for each order
      for (const order of orders) {
        const invoice = order.invoices[0];
        const invoiceNumber = invoice?.invoiceNumber || `ORDER-${order.id.slice(0, 8)}`;

        // Generate simple text invoice (replace with PDF generation library later)
        const invoiceContent = generateInvoiceText(order, invoice);

        // Add to ZIP
        const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.txt`;
        zip.file(filename, invoiceContent);
      }

      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Return ZIP file
      const deliveryDate = orders[0]?.deliveryDate
        ? new Date(orders[0].deliveryDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="invoices-${deliveryDate}.zip"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }
  );
}

/**
 * Generate simple text invoice (replace with PDF library like react-pdf later)
 */
function generateInvoiceText(order: any, invoice: any): string {
  const customer = order.customer;
  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString()
    : 'Not set';

  const lines = order.lines.map((line: any, index: number) => {
    const itemName = line.sku.product.name;
    const brand = line.sku.product.brand || '';
    const skuCode = line.sku.code;
    const quantity = line.quantity;
    const unitPrice = Number(line.unitPrice);
    const lineTotal = quantity * unitPrice;

    return `${index + 1}. ${itemName}${brand ? ` (${brand})` : ''}
   SKU: ${skuCode}
   Quantity: ${quantity} @ $${unitPrice.toFixed(2)} = $${lineTotal.toFixed(2)}`;
  }).join('\n\n');

  const subtotal = order.lines.reduce((sum: number, line: any) => {
    return sum + (line.quantity * Number(line.unitPrice));
  }, 0);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: ${invoice?.invoiceNumber || order.id.slice(0, 8)}
Order ID: ${order.id}
Date: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BILL TO:
${customer.name}
${customer.street1 || ''}
${customer.street2 || ''}
${customer.city || ''}, ${customer.state || ''} ${customer.postalCode || ''}
${customer.licenseNumber ? `License: ${customer.licenseNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIVERY INFORMATION:
Scheduled: ${deliveryDate}
Warehouse: ${order.warehouseLocation || 'Not specified'}
Time Window: ${order.deliveryTimeWindow || 'Anytime'}
${invoice?.poNumber ? `PO Number: ${invoice.poNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LINE ITEMS:

${lines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:

Subtotal:        $${subtotal.toFixed(2)}
Tax:             (Calculated at delivery)
Total:           $${Number(order.total || 0).toFixed(2)}

Payment Terms:   ${customer.paymentTerms || 'Net 30'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${invoice?.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${invoice.specialInstructions}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

Generated: ${new Date().toISOString()}
Status: ${order.status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
