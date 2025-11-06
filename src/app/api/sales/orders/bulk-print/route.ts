import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";
import JSZip from "jszip";
import { generateInvoicePDF } from "@/lib/invoices/pdf-generator";
import { buildInvoiceData } from "@/lib/invoices/invoice-data-builder";
import { formatUTCDate } from "@/lib/dates";
import { getInvoiceTemplateSettings } from "@/lib/invoices/template-settings";

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

      // Generate PDF invoice for each order
      for (const order of orders) {
        try {
          const invoice = order.invoices[0];
          const invoiceNumber = invoice?.invoiceNumber || `ORDER-${order.id.slice(0, 8)}`;

          // Build complete invoice data with calculations
          const invoiceData = await buildInvoiceData({
            orderId: order.id,
            tenantId,
            customerId: order.customer.id,
            specialInstructions: invoice?.specialInstructions || undefined,
            poNumber: invoice?.poNumber || undefined,
          });

          // Generate PDF buffer
          const templateSettings = await getInvoiceTemplateSettings(
            db,
            tenantId,
            invoiceData.invoiceFormatType
          );

          const pdfBuffer = await generateInvoicePDF(invoiceData, templateSettings);

          // Add to ZIP
          const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
          zip.file(filename, pdfBuffer);
        } catch (error) {
          // Log error but continue with other orders
          console.error(`Failed to generate PDF for order ${order.id}:`, error);
          // Add error notice to ZIP instead
          zip.file(`ERROR-${order.id.slice(0, 8)}.txt`, `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Return ZIP file
      const deliveryDate = orders[0]?.deliveryDate
        ? formatUTCDate(new Date(orders[0].deliveryDate))
        : formatUTCDate(new Date());

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
