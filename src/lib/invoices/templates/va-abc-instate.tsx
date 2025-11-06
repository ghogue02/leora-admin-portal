/**
 * VA ABC In-State Invoice Template
 *
 * Format: Total Wine / VA ABC Required Format
 * Used for: Virginia distributor → Virginia customer (excise taxes paid)
 *
 * Key Features:
 * - Three-column header (Bill To | Customer ID | Ship To)
 * - Wholesaler license number prominently displayed
 * - Ship date and due date
 * - Retailer signature section
 * - Compliance notice for tax-exempt invoices
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

  // VA ABC specific styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  headerLeft: {
    flex: 2,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  wholesalerInfo: {
    fontSize: 9,
    color: '#333',
    marginBottom: 1,
  },

  // Three-column customer section
  threeColumnSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    backgroundColor: '#fff',
  },
  columnHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
  },
  customerIdBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  customerIdLabel: {
    fontSize: 8,
    marginBottom: 3,
  },
  customerId: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Order details
  orderDetails: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    width: 120,
    fontSize: 9,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 9,
  },

  // Table columns (VA ABC In-State format)
  col_bottles: { width: '10%' },
  col_size: { width: '10%' },
  col_code: { width: '12%' },
  col_sku: { width: '10%' },
  col_brand: { width: '33%' },
  col_liters: { width: '10%' },
  col_price: { width: '10%' },
  col_amount: { width: '12%', textAlign: 'right' },

  // Signature section for retailer
  retailerSignature: {
    marginTop: 30,
    padding: 15,
    borderWidth: 2,
    borderColor: '#000',
  },
  retailerHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 10,
  },
});

interface VAAbcInstateInvoiceProps {
  data: CompleteInvoiceData;
}

export const VAAbcInstateInvoice: React.FC<VAAbcInstateInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const options = data.templateSettings?.options ?? {};

  const columnBorderStyle = palette.borderColor ? { borderColor: palette.borderColor } : undefined;
  const columnHeaderBackgroundStyle = palette.sectionHeaderBackground
    ? { backgroundColor: palette.sectionHeaderBackground }
    : undefined;
  const customerIdBoxBorderStyle = palette.borderColor
    ? { borderColor: palette.borderColor }
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

  const showCustomerIdColumn = options.showCustomerIdColumn ?? true;
  const useCondensedSignature = options.signatureStyle === 'condensed';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with company info and invoice details */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{data.tenantName}</Text>
            <Text style={styles.companySubtitle}>(formerly The Spanish Wine Importers LLC)</Text>
            <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8</Text>
            <Text style={styles.companyAddress}>Warrenton, VA 20187</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.wholesalerInfo}>
              Wholesaler's #: {data.wholesalerLicenseNumber || 'N/A'}
            </Text>
            <Text style={styles.wholesalerInfo}>
              Voice: {data.wholesalerPhone || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Invoice Title */}
        <View style={styles.mb15}>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        {/* Three-column section: Bill To | Customer ID | Ship To */}
        <View style={styles.threeColumnSection}>
          {/* Bill To */}
          <View style={[styles.column, columnBorderStyle]}>
            <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.street1}
              {data.billingAddress.street2 && `\n${data.billingAddress.street2}`}
            </Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
            </Text>
            {data.customer.phone && (
              <Text style={styles.customerAddress}>{data.customer.phone}</Text>
            )}
            {data.customer.billingEmail && (
              <Text style={styles.customerAddress}>{data.customer.billingEmail}</Text>
            )}
          </View>

          {/* Customer ID */}
          {showCustomerIdColumn && (
            <View style={[styles.column, columnBorderStyle]}>
              <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Customer ID</Text>
              <View style={[styles.customerIdBox, customerIdBoxBorderStyle]}>
                <Text style={styles.customerIdLabel}>ID</Text>
                <Text style={styles.customerId}>{data.customer.accountNumber || data.customer.id.substring(0, 8)}</Text>
              </View>
            </View>
          )}

          {/* Ship To */}
          <View style={[styles.column, columnBorderStyle]}>
            <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Ship To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerAddress}>
              {data.shippingAddress.street1}
              {data.shippingAddress.street2 && `\n${data.shippingAddress.street2}`}
            </Text>
            <Text style={styles.customerAddress}>
              {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
            </Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Number:</Text>
            <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.issuedAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Special instructions:</Text>
            <Text style={styles.detailValue}>{data.specialInstructions || 'None'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer P.O. number:</Text>
            <Text style={styles.detailValue}>{data.poNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment terms:</Text>
            <Text style={styles.detailValue}>{data.paymentTermsText}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Salesperson:</Text>
            <Text style={styles.detailValue}>{data.salesperson}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shipping method:</Text>
            <Text style={styles.detailValue}>{data.shippingMethod}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ship date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.shipDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.dueDate)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableHeader, tableHeaderBackgroundStyle]}>
            <Text style={[styles.tableCell, styles.col_bottles]}>No. bottles</Text>
            <Text style={[styles.tableCell, styles.col_size]}>Size</Text>
            <Text style={[styles.tableCell, styles.col_code]}>Code</Text>
            <Text style={[styles.tableCell, styles.col_sku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.col_brand]}>Brand & type</Text>
            <Text style={[styles.tableCell, styles.col_liters]}>Liters</Text>
            <Text style={[styles.tableCell, styles.col_price]}>Unit price</Text>
            <Text style={[styles.tableCell, styles.col_amount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {data.orderLines.map((line, index) => (
            <View key={index} style={[styles.tableRow, tableRowBorderStyle]}>
              <Text style={[styles.tableCell, styles.col_bottles]}>{line.quantity}</Text>
              <Text style={[styles.tableCell, styles.col_size]}>{line.sku.size || 'N/A'}</Text>
              <Text style={[styles.tableCell, styles.col_code]}>{line.sku.abcCodeNumber || 'N/A'}</Text>
              <Text style={[styles.tableCell, styles.col_sku]}>{line.sku.code}</Text>
              <Text style={[styles.tableCell, styles.col_brand]}>{line.sku.product.name}</Text>
              <Text style={[styles.tableCell, styles.col_liters]}>{line.totalLiters.toFixed(3)}</Text>
              <Text style={[styles.tableCell, styles.col_price]}>{formatCurrency(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.col_amount]}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Liters:</Text>
            <Text style={styles.totalValue}>{data.totalLiters.toFixed(3)}</Text>
          </View>
          <View style={[styles.grandTotalRow, grandTotalBorderStyle]}>
            <Text style={styles.grandTotalLabel}>Total Amount:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Retailer Signature Section */}
        <View style={styles.retailerSignature}>
          {useCondensedSignature ? (
            <>
              <Text style={styles.retailerHeader}>TO BE FILLED BY RETAIL LICENSEE</Text>
              <Text style={{ fontSize: 9, marginBottom: 8 }}>
                Goods listed above have been received and cash in full paid therefor on the above date. Goods received from:
              </Text>
              <View style={styles.signatureGrid}>
                <View style={styles.signatureField}>
                  <Text style={styles.signatureLabel}>Date: _______________</Text>
                </View>
                <View style={styles.signatureField}>
                  <Text style={styles.signatureLabel}>Signed: _______________</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.retailerHeader}>(TO BE FILLED IN BY RETAIL LICENSEE)</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <View style={styles.signatureField} />
              </View>

              <Text style={[styles.mb10, { fontSize: 8, marginTop: 10 }]}>
                Goods as listed above have been received and cash in full paid therefor on the above date.
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Goods received from:</Text>
              </View>
              <Text style={styles.mb5}>Name of Transportation Company: {data.tenantName}</Text>

              <View style={styles.signatureGrid}>
                <View style={styles.signatureField}>
                  <Text style={styles.signatureLabel}>Signed:</Text>
                </View>
                <View style={styles.signatureField}>
                  <Text style={styles.signatureLabel}>By:</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Compliance Notice */}
        <View style={styles.complianceNotice}>
          <Text>{data.complianceNotice}</Text>
        </View>

        {/* Legal Terms */}
        <View style={styles.legalText}>
          <Text>
            Accounts not paid on-time in accordance with the above due date are subject to{' '}
            {data.interestRate.times(100).toFixed(1)}% finance charges
          </Text>
        </View>
      </Page>
    </Document>
  );
};
