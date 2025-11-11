/**
 * Invoice PDF Generator
 *
 * Generates PDF invoices using existing VA ABC templates
 * Used by bulk print operation
 */

import { renderToStream } from '@react-pdf/renderer';
import { createElement } from 'react';
import {
  StandardInvoice,
  VAAbcInstateInvoice,
  VAAbcInstateInvoiceCondensed,
  VAAbcTaxExemptInvoice,
} from './templates';
import type { CompleteInvoiceData } from './invoice-data-builder';
import type { InvoiceTemplateSettings } from './template-settings';
import { resolveBaseTemplateComponent } from './template-settings';
import { calcSubtotal } from '@/lib/money/totals';
import Decimal from 'decimal.js';

/**
 * Generate PDF buffer for an invoice
 *
 * @param invoiceData - Invoice data from invoice-data-builder
 * @returns PDF as buffer
 */
export async function generateInvoicePDF(
  invoiceData: CompleteInvoiceData,
  templateSettings?: InvoiceTemplateSettings
): Promise<Buffer> {
  try {
    const baseTemplateChoice = resolveBaseTemplateComponent(
      invoiceData.invoiceFormatType,
      templateSettings?.baseTemplate
    );

    let Component = StandardInvoice;
    switch (baseTemplateChoice) {
      case 'VA_ABC_INSTATE_FULL':
        Component = VAAbcInstateInvoice;
        break;
      case 'VA_ABC_INSTATE_CONDENSED':
        Component = VAAbcInstateInvoiceCondensed;
        break;
      case 'VA_ABC_TAX_EXEMPT':
        Component = VAAbcTaxExemptInvoice;
        break;
      case 'STANDARD':
      default:
        Component = StandardInvoice;
        break;
    }

    const pdfData: CompleteInvoiceData = {
      ...invoiceData,
      templateSettings: templateSettings ?? invoiceData.templateSettings,
    };

    // Use existing invoice template components
    const stream = await renderToStream(
      createElement(Component, { data: pdfData })
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
  const { customer, orderLines } = invoiceData;

  const lineItems = orderLines.map((line, index) => {
    const quantity = line.quantity;
    const unitPrice = new Decimal(line.unitPrice);
    // Use money-safe arithmetic for line total
    const lineTotal = unitPrice.times(quantity);

    return `${index + 1}. ${line.productName}${line.brand ? ` (${line.brand})` : ''}
   SKU: ${line.skuCode}
   Quantity: ${quantity} @ $${unitPrice.toFixed(2)} = $${lineTotal.toFixed(2)}`;
  }).join('\n\n');

  // Use unified money-safe subtotal calculation
  const subtotal = calcSubtotal(orderLines.map(line => ({
    quantity: line.quantity,
    unitPrice: line.unitPrice
  })));
  const subtotalNumber = Number(subtotal.toFixed(2));

  const deliveryDate = invoiceData.orderDeliveryDate
    ? new Date(invoiceData.orderDeliveryDate).toLocaleDateString()
    : 'Not set';
  const warehouse = invoiceData.orderWarehouseLocation || 'Not specified';
  const timeWindow = invoiceData.orderDeliveryTimeWindow
    || invoiceData.customerDeliveryWindows?.[0]
    || 'Anytime';

  const instructionBlocks: string[] = [];
  if (invoiceData.customerDeliveryInstructions) {
    instructionBlocks.push(`Customer Instructions: ${invoiceData.customerDeliveryInstructions}`);
  }
  if (invoiceData.customerDeliveryWindows?.length) {
    instructionBlocks.push(`Preferred Windows: ${invoiceData.customerDeliveryWindows.join(', ')}`);
  }
  if (invoiceData.specialInstructions) {
    instructionBlocks.push(`Order Notes: ${invoiceData.specialInstructions}`);
  }
  const instructionSection = instructionBlocks.length
    ? `${instructionBlocks.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
    : '';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice Number: ${invoiceData.invoiceNumber}
Order ID: ${invoiceData.orderId}
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
Scheduled: ${deliveryDate}
Warehouse: ${warehouse}
Time Window: ${timeWindow}
${invoiceData.poNumber ? `PO Number: ${invoiceData.poNumber}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LINE ITEMS:

${lineItems}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:

Subtotal:        $${subtotalNumber.toFixed(2)}
Tax:             (Calculated at delivery)
Total:           $${Number(invoiceData.total || 0).toFixed(2)}

Payment Terms:   ${invoiceData.paymentTermsText || customer.paymentTerms || 'Net 30'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${instructionSection}

Generated: ${new Date().toISOString()}
Status: ${invoiceData.orderStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
