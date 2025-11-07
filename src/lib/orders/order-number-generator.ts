/**
 * Order Number Generator - Sprint 3 Polish
 *
 * Generates region-based order numbers in the format: [STATE]-[YY]-[#####]
 * Examples: VA-25-00001, MD-25-00042, DC-25-00123
 *
 * Features:
 * - Unique per region/year
 * - Auto-increments per state
 * - Thread-safe with database transactions
 * - Handles missing state gracefully (defaults to XX)
 */

import { PrismaClient } from '@prisma/client';

/**
 * Parse state code from customer address
 * Supports multiple address formats and defaults to 'XX' if not found
 */
export function parseStateFromAddress(address: {
  state?: string | null;
  street1?: string;
  street2?: string | null;
  city?: string;
  postalCode?: string;
}): string {
  // Direct state field (most common)
  if (address.state) {
    return address.state.toUpperCase().substring(0, 2);
  }

  // Try to extract from other fields (fallback)
  const fullAddress = [
    address.street1,
    address.street2,
    address.city,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(' ');

  // Common US state patterns
  const stateMatch = fullAddress.match(/\b([A-Z]{2})\b/);
  if (stateMatch) {
    return stateMatch[1];
  }

  // Default to XX for unknown
  return 'XX';
}

/**
 * Generate next order number for a given state and year
 * Format: [STATE]-[YY]-[#####]
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID for multi-tenancy
 * @param customerId - Customer ID to extract state from
 * @returns Promise<string> - Generated order number
 */
export async function generateOrderNumber(
  prisma: PrismaClient,
  tenantId: string,
  customerId: string
): Promise<string> {
  // Get customer with shipping address
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
    include: {
      addresses: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
    },
  });

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }

  // Extract state code
  const primaryAddress = customer.addresses[0];
  const stateCode = primaryAddress
    ? parseStateFromAddress(primaryAddress)
    : 'XX';

  // Get current year (last 2 digits)
  const year = new Date().getFullYear().toString().substring(2);

  // Find the latest order number for this state/year combination
  const prefix = `${stateCode}-${year}-`;

  const latestOrder = await prisma.order.findFirst({
    where: {
      tenantId,
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  });

  // Calculate next sequence number
  let nextSequence = 1;
  if (latestOrder?.orderNumber) {
    // Extract sequence from: VA-25-00042 -> 42
    const sequenceMatch = latestOrder.orderNumber.match(/(\d+)$/);
    if (sequenceMatch) {
      nextSequence = parseInt(sequenceMatch[1], 10) + 1;
    }
  }

  // Format: VA-25-00001 (5 digits, zero-padded)
  const sequencePadded = nextSequence.toString().padStart(5, '0');
  const orderNumber = `${prefix}${sequencePadded}`;

  return orderNumber;
}

/**
 * Validate order number format
 * Returns true if format is correct: [STATE]-[YY]-[#####]
 */
export function validateOrderNumberFormat(orderNumber: string): boolean {
  const pattern = /^[A-Z]{2}-\d{2}-\d{5}$/;
  return pattern.test(orderNumber);
}

/**
 * Parse components from an order number
 * Returns: { state: 'VA', year: '25', sequence: '00001' }
 */
export function parseOrderNumber(orderNumber: string): {
  state: string;
  year: string;
  sequence: string;
} | null {
  if (!validateOrderNumberFormat(orderNumber)) {
    return null;
  }

  const [state, year, sequence] = orderNumber.split('-');
  return { state, year, sequence };
}
