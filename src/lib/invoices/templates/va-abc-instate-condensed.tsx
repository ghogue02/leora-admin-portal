/**
 * VA ABC In-State Invoice Template - CONDENSED (Sprint 3 Polish)
 *
 * Optimized to fit 10-line orders on 1 page
 * Changes from original:
 * - Removed Customer ID column
 * - Reduced padding/margins (50% smaller)
 * - Smaller fonts (8pt -> 7pt)
 * - Tighter line-height
 * - Condensed retailer signature section
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { CompleteInvoiceData } from '../invoice-data-builder';
import { sharedStyles, formatCurrency, formatShortDate } from './styles';

const styles = StyleSheet.create({
  ...sharedStyles,

  // Condensed page margins
  page: {
    padding: 20, // Reduced from 30
    fontSize: 7,  // Reduced from 9
    lineHeight: 1.2, // Tighter than 1.4
  },

  // Condensed header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3, // Reduced from 5
  },
  headerLeft: {
    flex: 2,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 11, // Reduced from 14
    fontWeight: 'bold',
    marginBottom: 1,
  },
  companySubtitle: {
    fontSize: 7,  // Reduced from 9
    marginBottom: 1,
  },
  companyAddress: {
    fontSize: 7,  // Reduced from 9
    marginBottom: 0.5,
  },
  wholesalerInfo: {
    fontSize: 7,  // Reduced from 9
    marginBottom: 0.5,
  },

  // Condensed title
  title: {
    fontSize: 14, // Reduced from 18
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5, // Reduced from 10
  },

  // Two-column section (removed Customer ID column)
  twoColumnSection: {
    flexDirection: 'row',
    marginBottom: 8, // Reduced from 20
    gap: 10, // Reduced from 15
  },
  column: {
    flex: 1,
    borderWidth: 0.5, // Thinner border
    borderColor: '#ccc',
    padding: 5, // Reduced from 10
    backgroundColor: '#fff',
  },
  columnHeader: {
    fontSize: 7,  // Reduced from 9
    fontWeight: 'bold',
    marginBottom: 4, // Reduced from 8
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 2,
  },
  customerName: {
    fontSize: 7,  // Reduced from 9
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 6,  // Reduced from 8
    marginBottom: 1,
  },

  // Condensed order details
  orderDetails: {
    marginBottom: 6, // Reduced from 15
    paddingBottom: 4, // Reduced from 10
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 1, // Reduced from 3
  },
  detailLabel: {
    width: 80, // Reduced from 120
    fontSize: 6,  // Reduced from 9
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 6,  // Reduced from 9
  },

  // Condensed table
  table: {
    marginBottom: 6, // Reduced from 15
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 2, // Reduced from 4
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 2, // Reduced from 4
  },
  tableCell: {
    fontSize: 6,  // Reduced from 8
    padding: 1, // Reduced from 2
  },

  // Condensed table columns (rebalanced without Customer ID)
  col_bottles: { width: '8%' },  // Was 10%
  col_size: { width: '8%' },     // Was 10%
  col_code: { width: '10%' },    // Was 12%
  col_sku: { width: '10%' },     // Same
  col_brand: { width: '38%' },   // Increased from 33%
  col_liters: { width: '10%' },  // Same
  col_price: { width: '10%' },   // Same
  col_amount: { width: '12%', textAlign: 'right' }, // Same

  // Condensed totals
  totalsSection: {
    marginTop: 6, // Reduced from 15
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 150, // Reduced from 200
    marginBottom: 2, // Reduced from 5
  },
  totalLabel: {
    fontSize: 7,  // Reduced from 9
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 7,  // Reduced from 9
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 2, // Reduced from 5
  },
  grandTotalLabel: {
    fontSize: 8,  // Reduced from 11
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 8,  // Reduced from 11
    fontWeight: 'bold',
  },

  // Condensed retailer signature section (moved to footer area)
  retailerSignature: {
    marginTop: 8, // Reduced from 30
    padding: 6,   // Reduced from 15
    borderWidth: 1, // Thinner border (was 2)
    borderColor: '#000',
  },
  retailerHeader: {
    fontSize: 7,  // Reduced from 10
    fontWeight: 'bold',
    marginBottom: 4, // Reduced from 10
    textAlign: 'center',
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 6, // Reduced from 10
  },
  signatureField: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  signatureLabel: {
    fontSize: 6,  // Reduced from 7
  },

  // Condensed legal text
  complianceNotice: {
    marginTop: 4, // Reduced from 10
    padding: 3,   // Reduced from 8
    backgroundColor: '#f9f9f9',
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
  legalText: {
    marginTop: 3, // Reduced from 10
    fontSize: 5,  // Reduced from 7
    color: '#666',
  },

  // Utility spacing
  mb5: { marginBottom: 2 },   // Reduced from 5
  mb10: { marginBottom: 4 },  // Reduced from 10
  mb15: { marginBottom: 6 },  // Reduced from 15
});

interface VAAbcInstateInvoiceProps {
  data: CompleteInvoiceData;
}

export const VAAbcInstateInvoiceCondensed: React.FC<VAAbcInstateInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};

  const columnBorderStyle = palette.borderColor ? { borderColor: palette.borderColor } : undefined;
  const columnHeaderBackgroundStyle = palette.sectionHeaderBackground
    ? { backgroundColor: palette.sectionHeaderBackground }
    : undefined;
  const tableHeaderBackgroundStyle = palette.tableHeaderBackground
    ? { backgroundColor: palette.tableHeaderBackground }
    : undefined;
  const tableRowBorderStyle = palette.borderColor
    ? { borderBottomColor: palette.borderColor }
    : undefined;
  const grandTotalBorderStyle = palette.borderColor
    ? { borderTopColor: palette.borderColor }
    : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Condensed Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{data.tenantName}</Text>
            <Text style={styles.companySubtitle}>(formerly The Spanish Wine Importers LLC)</Text>
            <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8, Warrenton, VA 20187</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.wholesalerInfo}>
              Wholesaler #: {data.wholesalerLicenseNumber || 'N/A'}
            </Text>
            <Text style={styles.wholesalerInfo}>
              Voice: {data.wholesalerPhone || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Condensed Title */}
        <View style={styles.mb15}>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        {/* Two-column section: Bill To | Ship To (NO Customer ID) */}
        <View style={styles.twoColumnSection}>
          {/* Bill To */}
          <View style={[styles.column, columnBorderStyle]}>
            <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.street1}
              {data.billingAddress.street2 && `, ${data.billingAddress.street2}`}
            </Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
            </Text>
          </View>

          {/* Ship To */}
          <View style={[styles.column, columnBorderStyle]}>
            <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Ship To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerAddress}>
              {data.shippingAddress.street1}
              {data.shippingAddress.street2 && `, ${data.shippingAddress.street2}`}
            </Text>
            <Text style={styles.customerAddress}>
              {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
            </Text>
          </View>
        </View>

        {/* Condensed Order Details (2 columns) */}
        <View style={styles.orderDetails}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice #:</Text>
                <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice Date:</Text>
                <Text style={styles.detailValue}>{formatShortDate(data.issuedAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PO Number:</Text>
                <Text style={styles.detailValue}>{data.poNumber || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Salesperson:</Text>
                <Text style={styles.detailValue}>{data.salesperson}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ship Date:</Text>
                <Text style={styles.detailValue}>{formatShortDate(data.shipDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date:</Text>
                <Text style={styles.detailValue}>{formatShortDate(data.dueDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment:</Text>
                <Text style={styles.detailValue}>{data.paymentTermsText}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ship Method:</Text>
                <Text style={styles.detailValue}>{data.shippingMethod}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Condensed Line Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, tableHeaderBackgroundStyle]}>
            <Text style={[styles.tableCell, styles.col_bottles]}>Bottles</Text>
            <Text style={[styles.tableCell, styles.col_size]}>Size</Text>
            <Text style={[styles.tableCell, styles.col_code]}>Code</Text>
            <Text style={[styles.tableCell, styles.col_sku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.col_brand]}>Brand & Type</Text>
            <Text style={[styles.tableCell, styles.col_liters]}>Liters</Text>
            <Text style={[styles.tableCell, styles.col_price]}>Price</Text>
            <Text style={[styles.tableCell, styles.col_amount]}>Amount</Text>
          </View>

          {data.orderLines.map((line, index) => (
            <View key={index} style={[styles.tableRow, tableRowBorderStyle]}>
              <Text style={[styles.tableCell, styles.col_bottles]}>{line.quantity}</Text>
              <Text style={[styles.tableCell, styles.col_size]}>{line.sku.size || '-'}</Text>
              <Text style={[styles.tableCell, styles.col_code]}>{line.sku.abcCodeNumber || '-'}</Text>
              <Text style={[styles.tableCell, styles.col_sku]}>{line.sku.code}</Text>
              <Text style={[styles.tableCell, styles.col_brand]}>{line.sku.product.name}</Text>
              <Text style={[styles.tableCell, styles.col_liters]}>{line.totalLiters.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.col_price]}>{formatCurrency(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.col_amount]}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Condensed Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Liters:</Text>
            <Text style={styles.totalValue}>{data.totalLiters.toFixed(2)}</Text>
          </View>
          <View style={[styles.grandTotalRow, grandTotalBorderStyle]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Condensed Retailer Signature */}
        <View style={styles.retailerSignature}>
          <Text style={styles.retailerHeader}>TO BE FILLED BY RETAIL LICENSEE</Text>
          <Text style={{ fontSize: 5, marginBottom: 3 }}>
            Goods listed received and cash paid in full on date below
          </Text>
          <View style={styles.signatureGrid}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Date: _______________</Text>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Signed: _______________</Text>
            </View>
          </View>
        </View>

        {/* Condensed Legal */}
        <View style={styles.legalText}>
          <Text>
            {data.interestRate.times(100).toFixed(1)}% finance charge on late payments. {data.complianceNotice}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
