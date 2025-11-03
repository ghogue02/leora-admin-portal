/**
 * Invoice Number Generator
 *
 * Generates invoice numbers using Travis's format:
 * [STATE][YEAR][SEQUENCE]
 *
 * Format Rules:
 * - State abbreviation from customer location (VA, MD, DC) OR "TE" if tax exempt
 * - Last 2 digits of delivery date year (26 for 2026)
 * - 5-digit sequential number starting at 00001
 *
 * Examples:
 * - VA260001 (Virginia, 2026, first invoice)
 * - TE260015 (Tax Exempt, 2026, 15th invoice)
 * - MD250123 (Maryland, 2025, 123rd invoice)
 *
 * Purpose:
 * - Helps wholesaler track excise taxes by state
 * - Separate sequences for each state/year combination
 * - Tax exempt invoices tracked separately
 */

import type { PrismaClient, Prisma } from '@prisma/client';

export async function generateInvoiceNumber(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  customerId: string,
  deliveryDate: Date
): Promise<string> {
  // 1. Get customer's invoice state code
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      invoiceStateCode: true,
      state: true,
      isTaxExempt: true,
    },
  });

  if (!customer) {
    throw new Error('Customer not found for invoice number generation');
  }

  // 2. Determine state code for invoice
  // Priority: invoiceStateCode > 'TE' if tax exempt > customer.state > 'VA' default
  let stateCode: string;

  if (customer.invoiceStateCode) {
    stateCode = customer.invoiceStateCode;
  } else if (customer.isTaxExempt) {
    stateCode = 'TE';
  } else if (customer.state) {
    stateCode = customer.state;
  } else {
    stateCode = 'VA'; // Default fallback
  }

  // Ensure uppercase and max 2 characters
  stateCode = stateCode.toUpperCase().substring(0, 2);

  // 3. Get year from delivery date (last 2 digits)
  const year = deliveryDate.getFullYear().toString().slice(-2); // "26" for 2026

  // 4. Build prefix: [STATE][YY]
  const prefix = `${stateCode}${year}`;

  // 5. Get next sequence number for this state+year combination
  // Find the highest invoice number with this prefix
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  let sequenceNumber = 1;

  if (lastInvoice && lastInvoice.invoiceNumber) {
    // Extract sequence from last invoice number
    // Example: "VA260005" → extract "00005" → parse to 5
    const sequencePart = lastInvoice.invoiceNumber.slice(-5);
    const lastSequence = parseInt(sequencePart, 10);

    if (!isNaN(lastSequence)) {
      sequenceNumber = lastSequence + 1;
    }
  }

  // 6. Format final invoice number: [STATE][YY][00000]
  const sequenceFormatted = sequenceNumber.toString().padStart(5, '0');
  const invoiceNumber = `${prefix}${sequenceFormatted}`;

  return invoiceNumber;
}

/**
 * Get invoice number prefix for a customer and year
 * Useful for analytics and reporting
 */
export function getInvoicePrefix(
  customerStateCode: string,
  deliveryYear: number
): string {
  const stateCode = customerStateCode.toUpperCase().substring(0, 2);
  const year = deliveryYear.toString().slice(-2);
  return `${stateCode}${year}`;
}

/**
 * Parse invoice number into components
 */
export interface ParsedInvoiceNumber {
  stateCode: string;
  year: string;
  sequence: number;
  fullNumber: string;
}

export function parseInvoiceNumber(invoiceNumber: string): ParsedInvoiceNumber | null {
  // Expected format: [STATE][YY][00000]
  // Example: VA260001
  if (invoiceNumber.length !== 9) {
    return null;
  }

  const stateCode = invoiceNumber.substring(0, 2);
  const year = invoiceNumber.substring(2, 4);
  const sequenceStr = invoiceNumber.substring(4, 9);
  const sequence = parseInt(sequenceStr, 10);

  if (isNaN(sequence)) {
    return null;
  }

  return {
    stateCode,
    year,
    sequence,
    fullNumber: invoiceNumber,
  };
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  const parsed = parseInvoiceNumber(invoiceNumber);
  return parsed !== null;
}

/**
 * Get invoice count for a state/year combination
 * Useful for reporting: "We've issued 1,234 VA invoices in 2026"
 */
export async function getInvoiceCountByStateYear(
  prisma: PrismaClient,
  tenantId: string,
  stateCode: string,
  year: number
): Promise<number> {
  const prefix = getInvoicePrefix(stateCode, year);

  const count = await prisma.invoice.count({
    where: {
      tenantId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  });

  return count;
}
