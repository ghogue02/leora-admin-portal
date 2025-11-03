/**
 * Shared Order Calculation Utilities
 *
 * Ensures consistent calculations between admin and sales endpoints
 */

type OrderLine = {
  quantity: number;
  unitPrice: number | string;
};

type Order = {
  total: number | string | null;
  lines?: OrderLine[];
};

/**
 * Calculate order total from line items or use pre-calculated total
 *
 * This function ensures both admin and sales endpoints calculate totals identically
 *
 * Logic:
 * 1. If order.total exists and is > 0, use it
 * 2. Otherwise, calculate from line items (quantity * unitPrice)
 * 3. Return 0 if neither exists
 *
 * @param order - Order with total and/or lines
 * @returns Calculated total as a number
 */
export function calculateOrderTotal(order: Order): number {
  // Use pre-calculated total if available and valid
  if (order.total && Number(order.total) > 0) {
    return Number(order.total);
  }

  // Calculate from line items if available
  if (order.lines && order.lines.length > 0) {
    return order.lines.reduce(
      (sum, line) => sum + (line.quantity * Number(line.unitPrice)),
      0
    );
  }

  // No total or lines available
  return 0;
}

/**
 * Calculate subtotal from line items only (ignores order.total)
 *
 * @param lines - Array of order line items
 * @returns Calculated subtotal
 */
export function calculateSubtotalFromLines(lines: OrderLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (line.quantity * Number(line.unitPrice)),
    0
  );
}

/**
 * Format order total as currency string
 *
 * @param order - Order with total and/or lines
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatOrderTotal(order: Order, currency: string = 'USD'): string {
  const total = calculateOrderTotal(order);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(total);
}
