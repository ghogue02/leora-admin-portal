/**
 * Invoice Data Builder
 *
 * Main service that builds complete invoice data with all calculated fields
 * for any invoice format (Standard, VA ABC In-State, VA ABC Tax-Exempt)
 */

import { PrismaClient, InvoiceFormatType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { determineInvoiceFormat, shouldApplyExciseTax } from './format-selector';
import { calculateInvoiceTaxes } from './tax-calculator';
import { calculateLineItemLiters, calculateInvoiceTotalLiters } from './liter-calculator';
import { bottlesToCases } from './case-converter';
import { getVACollectionTerms, getVAComplianceNotice, VA_INTEREST_RATE } from './interest-calculator';
import type { InvoiceTemplateSettings } from './template-settings';

const prisma = new PrismaClient();

export interface InvoiceDataInput {
  orderId: string;
  tenantId: string;
  customerId: string;
  formatOverride?: InvoiceFormatType;
  specialInstructions?: string;
  poNumber?: string;
  shippingMethod?: string;
}

export interface EnrichedOrderLine {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: Decimal;
  casesQuantity: Decimal;
  totalLiters: Decimal;
  lineTotal: Decimal;
  sku: {
    code: string;
    size: string | null;
    liters: Decimal | null;
    itemsPerCase: number | null;
    abcCodeNumber: string | null;
    product: {
      name: string;
      category: string | null;
    };
  };
}

export interface CompleteInvoiceData {
  // Core invoice fields
  invoiceNumber: string;
  issuedAt: Date;
  dueDate: Date;
  subtotal: Decimal;
  total: Decimal;

  // Format and display
  invoiceFormatType: InvoiceFormatType;
  formatDescription: string;

  // Customer and shipping
  customer: any;
  billingAddress: any;
  shippingAddress: any;

  // Order details
  salesperson: string;
  paymentTermsText: string;
  shippingMethod: string;
  shipDate: Date;
  specialInstructions: string | null;
  poNumber: string | null;

  // Calculations
  totalLiters: Decimal;
  exciseTax: Decimal;
  salesTax: Decimal;
  totalTax: Decimal;

  // Legal and compliance
  interestRate: Decimal;
  collectionTerms: string;
  complianceNotice: string;

  // Line items
  orderLines: EnrichedOrderLine[];

  // Tenant/wholesaler info
  wholesalerLicenseNumber: string | null;
  wholesalerPhone: string | null;
  tenantName: string;

  // Template customization
  templateSettings?: InvoiceTemplateSettings;
}

/**
 * Build complete invoice data with all calculated fields
 *
 * This is the main entry point for invoice generation
 *
 * @param input - Invoice data input
 * @returns Complete invoice data ready for PDF generation
 */
export async function buildInvoiceData(input: InvoiceDataInput): Promise<CompleteInvoiceData> {
  const { orderId, tenantId, customerId, formatOverride, specialInstructions, poNumber, shippingMethod } = input;

  // Fetch all required data
  const [order, customer, tenant] = await Promise.all([
    prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        salesRep: {
          include: {
            user: true,
          },
        },
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    }),
  ]);

  // Determine invoice format
  const invoiceFormatType = formatOverride || determineInvoiceFormat({
    customerState: customer.state,
    customerLicenseType: customer.licenseType,
    distributorState: 'VA', // TODO: Make this configurable per tenant
  });

  // Calculate enriched order lines with liters and cases
  const enrichedOrderLines: EnrichedOrderLine[] = order.lines.map((line) => {
    const totalLiters = calculateLineItemLiters(line.quantity, line.sku.size);
    const casesQuantity = bottlesToCases(line.quantity, line.sku.itemsPerCase);
    const lineTotal = new Decimal(line.unitPrice).times(line.quantity);

    return {
      id: line.id,
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      casesQuantity,
      totalLiters,
      lineTotal,
      sku: line.sku,
    };
  });

  // Calculate invoice totals
  const invoiceTotalLiters = calculateInvoiceTotalLiters(
    enrichedOrderLines.map(line => ({
      quantity: line.quantity,
      bottleSize: line.sku.size,
      totalLiters: line.totalLiters,
    }))
  );

  const subtotal = enrichedOrderLines.reduce(
    (sum, line) => sum.plus(line.lineTotal),
    new Decimal(0)
  );

  // Calculate taxes
  const taxes = await calculateInvoiceTaxes({
    tenantId,
    customerState: customer.state,
    distributorState: 'VA',
    totalLiters: invoiceTotalLiters,
    subtotal,
    includeExcise: shouldApplyExciseTax(invoiceFormatType),
    includeSales: false, // VA ABC invoices don't typically show sales tax separately
  });

  const total = subtotal.plus(taxes.totalTax);

  // Generate invoice number if not provided
  const invoiceNumber = await generateInvoiceNumber(tenantId);

  // Set dates
  const issuedAt = new Date();
  const dueDate = calculateDueDate(issuedAt, customer.paymentTerms || 'Net 30');
  const shipDate = new Date(); // TODO: Get from order or delivery schedule

  // Get salesperson name
  const salesperson = customer.salesRep?.user?.fullName || 'Unassigned';

  // Get payment terms text
  const paymentTermsText = customer.paymentTerms || 'Net 30';

  // Get billing and shipping addresses
  const billingAddress = {
    street1: customer.street1,
    street2: customer.street2,
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
  };

  const shippingAddress = customer.addresses?.[0] || billingAddress;

  // Get VA-specific legal text
  const collectionTerms = getVACollectionTerms(VA_INTEREST_RATE);
  const complianceNotice = getVAComplianceNotice(invoiceFormatType === 'VA_ABC_TAX_EXEMPT');

  return {
    // Core fields
    invoiceNumber,
    issuedAt,
    dueDate,
    subtotal,
    total,

    // Format
    invoiceFormatType,
    formatDescription: invoiceFormatType,

    // Customer
    customer,
    billingAddress,
    shippingAddress,

    // Order details
    salesperson,
    paymentTermsText,
    shippingMethod: shippingMethod || 'Hand deliver',
    shipDate,
    specialInstructions: specialInstructions || null,
    poNumber: poNumber || null,

    // Calculations
    totalLiters: invoiceTotalLiters,
    exciseTax: taxes.exciseTax,
    salesTax: taxes.salesTax,
    totalTax: taxes.totalTax,

    // Legal
    interestRate: VA_INTEREST_RATE,
    collectionTerms,
    complianceNotice,

    // Line items
    orderLines: enrichedOrderLines,

    // Tenant info
    wholesalerLicenseNumber: tenant.wholesalerLicenseNumber,
    wholesalerPhone: tenant.wholesalerPhone,
    tenantName: tenant.name,
  };
}

/**
 * Generate next invoice number
 *
 * Format: INV-YYYYMM-XXXX
 *
 * @param tenantId - Tenant ID
 * @returns Generated invoice number
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const now = new Date();
  const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');

  // Find the latest invoice for this month
  const prefix = `INV-${yearMonth}-`;

  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let sequence = 1;
  if (latestInvoice?.invoiceNumber) {
    const match = latestInvoice.invoiceNumber.match(/-(\d{4})$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Calculate due date from payment terms
 *
 * @param issuedAt - Invoice issue date
 * @param paymentTerms - Payment terms string
 * @returns Due date
 */
function calculateDueDate(issuedAt: Date, paymentTerms: string): Date {
  const dueDate = new Date(issuedAt);

  // Parse common payment terms
  if (paymentTerms.toLowerCase().includes('cod') || paymentTerms.toLowerCase().includes('c.o.d')) {
    return dueDate; // Due immediately
  }

  // Extract number of days from terms like "Net 30", "30 days", etc.
  const daysMatch = paymentTerms.match(/(\d+)/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : 30;

  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

/**
 * Update OrderLine records with calculated values
 *
 * Saves casesQuantity and totalLiters to database
 *
 * @param orderLines - Enriched order lines
 */
export async function saveCalculatedOrderLineValues(
  orderLines: EnrichedOrderLine[]
): Promise<void> {
  await Promise.all(
    orderLines.map((line) =>
      prisma.orderLine.update({
        where: { id: line.id },
        data: {
          casesQuantity: line.casesQuantity,
          totalLiters: line.totalLiters,
        },
      })
    )
  );
}

/**
 * Create or update invoice with all VA ABC fields
 *
 * @param input - Invoice creation input
 * @returns Created invoice
 */
export async function createVAInvoice(input: InvoiceDataInput) {
  const invoiceData = await buildInvoiceData(input);

  // Save calculated values to order lines
  await saveCalculatedOrderLineValues(invoiceData.orderLines);

  // Create invoice record
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      customerId: input.customerId,
      invoiceNumber: invoiceData.invoiceNumber,
      status: 'DRAFT',
      subtotal: invoiceData.subtotal,
      total: invoiceData.total,
      dueDate: invoiceData.dueDate,
      issuedAt: invoiceData.issuedAt,

      // VA ABC fields
      invoiceFormatType: invoiceData.invoiceFormatType,
      salesperson: invoiceData.salesperson,
      paymentTermsText: invoiceData.paymentTermsText,
      shippingMethod: invoiceData.shippingMethod,
      shipDate: invoiceData.shipDate,
      specialInstructions: invoiceData.specialInstructions,
      poNumber: invoiceData.poNumber,
      totalLiters: invoiceData.totalLiters,
      interestRate: invoiceData.interestRate,
      collectionTerms: invoiceData.collectionTerms,
      complianceNotice: invoiceData.complianceNotice,
    },
    include: {
      customer: true,
      order: {
        include: {
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
      },
    },
  });

  return invoice;
}
