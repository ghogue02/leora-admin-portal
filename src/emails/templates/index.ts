/**
 * Email Templates Export
 * Centralized export for all email templates
 */

import { OrderStatusChanged } from './order-status-changed';
import { InvoiceReady } from './invoice-ready';
import { LowInventoryAlert } from './low-inventory-alert';
import { DailySummary } from './daily-summary';

export const emailTemplates = {
  orderStatusChanged: OrderStatusChanged,
  invoiceReady: InvoiceReady,
  lowInventoryAlert: LowInventoryAlert,
  dailySummary: DailySummary,
} as const;

export type EmailTemplateName = keyof typeof emailTemplates;

export { OrderStatusChanged, InvoiceReady, LowInventoryAlert, DailySummary };
