/**
 * Invoice PDF Generator
 *
 * Generates PDF invoices using existing VA ABC templates
 * Used by bulk print operation
 */

import { renderToStream } from '@react-pdf/renderer';
import { StandardInvoice } from './templates';
import type { CompleteInvoiceData } from './invoice-data-builder';

/**
 * Generate PDF buffer for an invoice
 *
 * @param invoiceData - Invoice data from invoice-data-builder
 * @returns PDF as buffer
 */
export async function generateInvoicePDF(invoiceData: CompleteInvoiceData): Promise<Buffer> {
  try {
    // Use existing invoice template components
    const stream = await renderToStream(
      StandardInvoice({ data: invoiceData })
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generate simple text invoice (fallback if PDF fails)
 */
export function generateInvoiceText(invoiceData: CompleteInvoiceData): string {
  const { order, customer, lines } = invoiceData;

  const lineItems = lines.map((line, index) => {
    const quantity = line.quantity;
    const unitPrice = Number(line.unitPrice);
    const lineTotal = quantity * unitPrice;

    return `${index + 1}. ${line.productName}${line.brand ? ` (${line.brand})` : ''}
   SKU: ${line.skuCode}
   Quantity: ${quantity} @ $${unitPrice.toFixed(2)} = $${lineTotal.toFixed(2)}`;
  }).join('\n\n');

  const subtotal = lines.reduce((sum, line) => {
    return sum + (line.quantity * Number(line.unitPrice));
  }, 0);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: ${order.invoiceNumber || order.id.slice(0, 8)}
Order ID: ${order.id}
Date: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BILL TO:
${customer.name}
${customer.address?.street1 || ''}
${customer.address?.street2 || ''}
${customer.address?.city || ''}, ${customer.address?.state || ''} ${customer.address?.postalCode || ''}
${customer.licenseNumber ? `License: ${customer.licenseNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DELIVERY INFORMATION:
Scheduled: ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set'}
Warehouse: ${order.warehouseLocation || 'Not specified'}
Time Window: ${order.deliveryTimeWindow || 'Anytime'}
${order.poNumber ? `PO Number: ${order.poNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LINE ITEMS:

${lineItems}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:

Subtotal:        $${subtotal.toFixed(2)}
Tax:             (Calculated at delivery)
Total:           $${Number(order.total || 0).toFixed(2)}

Payment Terms:   ${customer.paymentTerms || 'Net 30'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${order.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${order.specialInstructions}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

Generated: ${new Date().toISOString()}
Status: ${order.status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
