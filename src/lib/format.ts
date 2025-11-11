/**
 * Formatting Utilities
 *
 * Centralized formatting functions for dates, currency, and numbers.
 * Consolidates 5+ different date formatting patterns and 3+ currency patterns.
 *
 * Usage:
 * import { formatDate, formatCurrency, formatQuantity } from '@/lib/format';
 *
 * Benefits:
 * - Consistent formatting across the app
 * - Single place to update formats
 * - Timezone handling in one location
 * - Easy to add new formatters
 */

import { format, parseISO } from 'date-fns';

/**
 * Date Formatters
 */

/**
 * Format delivery date with day name
 * Example: "Mon, Nov 2, 2025"
 */
export function formatDeliveryDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE, MMM d, yyyy');
}

/**
 * Format full date with weekday name
 * Example: "Monday, November 2, 2025"
 */
export function formatFullDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, MMMM d, yyyy');
}

/**
 * Format short date
 * Example: "Nov 2, 2025"
 */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Format date with time
 * Example: "Nov 2, 2025 at 2:30 PM"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy \'at\' h:mm a');
}

/**
 * Format relative date
 * Example: "Today", "Tomorrow", "In 3 days", "Nov 2, 2025"
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const targetDate = new Date(d);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatShortDate(d);
}

/**
 * Format date for operations queue display
 * Example: "Mon, Nov 2"
 */
export function formatQueueDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE, MMM d');
}

/**
 * Currency Formatters
 */

/**
 * Format currency with symbol
 * Example: "$1,234.56"
 */
type FormatCurrencyOptions = {
  decimals?: number;
};

export function formatCurrency(
  amount: number | string,
  currency: string = 'USD',
  options?: FormatCurrencyOptions
): string {
  // Convert to number (handle Prisma Decimal too)
  let numAmount: number;
  if (typeof amount === 'string') {
    numAmount = parseFloat(amount);
  } else if (typeof amount === 'object' && amount !== null && 'toNumber' in amount) {
    numAmount = (amount as any).toNumber();
  } else {
    numAmount = amount as number;
  }

  if (isNaN(numAmount)) return '$0';

  // React 19-safe manual formatting (no Intl)
  const isNegative = numAmount < 0;
  const absAmount = Math.abs(numAmount);
  const decimals = Math.max(0, options?.decimals ?? 0);

  // Format with requested precision and thousand separators
  const formatted = absAmount
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Currency symbols
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
  };

  const symbol = symbols[currency] || '$';
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Format price (alias for formatCurrency for semantic clarity)
 */
export function formatPrice(amount: number | string): string {
  return formatCurrency(amount);
}

/**
 * Format compact currency (for large amounts)
 * Example: "$1.2K", "$1.5M"
 * React 19-safe manual implementation
 */
export function formatCompactCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;

  let value: number;
  let suffix: string;

  if (absAmount >= 1000000) {
    value = absAmount / 1000000;
    suffix = 'M';
  } else if (absAmount >= 1000) {
    value = absAmount / 1000;
    suffix = 'K';
  } else {
    return formatCurrency(amount);
  }

  const formatted = value.toFixed(1);
  return `${isNegative ? '-' : ''}$${formatted}${suffix}`;
}

/**
 * Number Formatters
 */

/**
 * Format quantity with thousand separators
 * Example: "1,234"
 * React 19-safe manual implementation
 */
export function formatQuantity(qty: number): string {
  return Math.floor(qty)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format number
 * Example: "1,234.56"
 * React 19-safe manual implementation
 */
export function formatNumber(value: number, decimals: number = 0): string {
  const formatted = value
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return formatted;
}

/**
 * Format percentage
 * Example: "45.5%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format phone number
 * Example: "(555) 123-4567"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone; // Return original if can't parse
}

/**
 * Text Formatters
 */

/**
 * Format status text (remove underscores, title case)
 * Example: "READY_TO_DELIVER" → "Ready To Deliver"
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate text with ellipsis
 * Example: "Long text here..." (max 20 chars)
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * File size formatter
 * Example: "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
