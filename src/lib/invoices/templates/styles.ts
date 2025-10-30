/**
 * Shared PDF Styles for Invoice Templates
 *
 * Common styles used across all invoice formats
 */

import { StyleSheet } from '@react-pdf/renderer';

export const sharedStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },

  // Header styles
  header: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companySubtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 1,
  },
  companyAddress: {
    fontSize: 9,
    color: '#333',
  },

  // Title styles
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },

  // Invoice info
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  invoiceInfoColumn: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    marginTop: 2,
  },

  // Customer section
  customerSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  customerColumn: {
    flex: 1,
    paddingRight: 10,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerAddress: {
    fontSize: 9,
    lineHeight: 1.4,
  },

  // Table styles
  table: {
    marginTop: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    fontSize: 9,
  },
  tableCell: {
    padding: 2,
  },

  // Totals section
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
    width: 250,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    fontSize: 10,
    width: 100,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 2,
    borderTopColor: '#000',
    paddingTop: 8,
    marginTop: 8,
    width: 250,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 100,
    textAlign: 'right',
  },

  // Footer/signature section
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  signatureRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  signatureField: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginRight: 20,
    paddingBottom: 5,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 3,
  },

  // Legal/compliance text
  legalText: {
    fontSize: 7,
    lineHeight: 1.3,
    marginTop: 20,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
  },
  complianceNotice: {
    fontSize: 7,
    lineHeight: 1.4,
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Utility styles
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  mb5: {
    marginBottom: 5,
  },
  mb10: {
    marginBottom: 10,
  },
  mb15: {
    marginBottom: 15,
  },
  mt10: {
    marginTop: 10,
  },
  mt15: {
    marginTop: 15,
  },
});

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | string | { toNumber: () => number }): string {
  const num = typeof amount === 'object' && 'toNumber' in amount
    ? amount.toNumber()
    : typeof amount === 'string'
    ? parseFloat(amount)
    : amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format date for invoice display
 */
export function formatInvoiceDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format short date (Jul 16, 2025)
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
