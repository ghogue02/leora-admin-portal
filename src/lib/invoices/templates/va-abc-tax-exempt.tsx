/**
 * VA ABC Tax-Exempt Invoice Template
 *
 * Format: Cask & Cork / Distributor's Wine Invoice
 * Used for: Virginia distributor → Out-of-state customer (no excise taxes)
 *
 * Key Features:
 * - "Distributor's Wine Invoice" title
 * - Licensee/License # field
 * - Shows both TOTAL CASES and TOTAL BOTTLES
 * - Supports fractional cases (8.83)
 * - Complex CODE NUMBER format
 * - Two-page format with extended compliance notice
 * - Transportation company field
 * - Multiple signature sections
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

  // Tax-exempt specific styles
  distributorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 20,
  },

  // Header info section
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  invoiceCol: {
    flex: 1,
  },

  // Licensee section
  licenseeSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
  },
  licenseeLabelRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  // Table columns (Tax-Exempt format - different from in-state!)
  col_cases: { width: '10%' },
  col_bottles: { width: '10%' },
  col_size: { width: '10%' },
  col_codeNumber: { width: '15%' },
  col_sku: { width: '10%' },
  col_brand: { width: '25%' },
  col_liters: { width: '8%' },
  col_bottlePrice: { width: '10%' },
  col_totalCost: { width: '12%', textAlign: 'right' },

  // Payment terms box
  paymentTermsBox: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },

  // Page 2 styles
  page2Header: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  transportationSection: {
    marginTop: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
});

interface VAAbcTaxExemptInvoiceProps {
  data: CompleteInvoiceData;
}

export const VAAbcTaxExemptInvoice: React.FC<VAAbcTaxExemptInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};

  const tableHeaderBackgroundStyle = palette.tableHeaderBackground
    ? { backgroundColor: palette.tableHeaderBackground }
    : undefined;
  const tableRowBorderStyle = palette.borderColor
    ? { borderBottomColor: palette.borderColor }
    : undefined;
  const columnBorderStyle = palette.borderColor
    ? { borderColor: palette.borderColor }
    : undefined;
  const sectionHeaderBackgroundStyle = palette.sectionHeaderBackground
    ? { backgroundColor: palette.sectionHeaderBackground }
    : undefined;

  return (
    <Document>
      {/* PAGE 1: Invoice Details */}
      <Page size="A4" style={styles.page}>
        {/* Company Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.tenantName}</Text>
          <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8, Warrenton, VA 20187</Text>
        </View>

        {/* Title */}
        <Text style={styles.distributorTitle}>Distributor's Wine Invoice</Text>

        {/* Invoice Info */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceCol}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Number:</Text>
              <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{formatShortDate(data.issuedAt)}</Text>
            </View>
          </View>
          <View style={styles.invoiceCol}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Terms:</Text>
              <Text style={styles.detailValue}>{data.paymentTermsText}</Text>
            </View>
          </View>
        </View>

        {/* Licensee Section */}
        <View style={[styles.licenseeSection, columnBorderStyle]}>
          <View style={styles.licenseeLabelRow}>
            <Text style={[styles.detailLabel, { width: 150 }]}>Licensee:</Text>
            <Text style={styles.detailValue}>{data.customer.name}</Text>
          </View>
          <View style={styles.licenseeLabelRow}>
            <Text style={[styles.detailLabel, { width: 150 }]}>Licensee/License #:</Text>
            <Text style={styles.detailValue}>{data.customer.licenseNumber || 'N/A'}</Text>
          </View>
          <View style={styles.mb5}>
            <Text style={styles.detailLabel}>Street Address:</Text>
            <Text style={styles.detailValue}>
              {data.billingAddress.street1}
              {data.billingAddress.street2 && `, ${data.billingAddress.street2}`}
            </Text>
          </View>
          <View style={styles.mb5}>
            <Text style={styles.detailLabel}>City/State/Zip:</Text>
            <Text style={styles.detailValue}>
              {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { width: 150 }]}>Salesperson:</Text>
            <Text style={styles.detailValue}>{data.salesperson}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { width: 150 }]}>PO #:</Text>
            <Text style={styles.detailValue}>{data.poNumber || 'N/A'}</Text>
          </View>
          {data.specialInstructions && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { width: 150 }]}>Special Instructions:</Text>
              <Text style={styles.detailValue}>{data.specialInstructions}</Text>
            </View>
          )}
        </View>

        {/* Line Items Table with CASES column */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableHeader, tableHeaderBackgroundStyle]}>
            <Text style={[styles.tableCell, styles.col_cases]}>TOTAL CASES</Text>
            <Text style={[styles.tableCell, styles.col_bottles]}>TOTAL BOTTLES</Text>
            <Text style={[styles.tableCell, styles.col_size]}>SIZE IN LITERS</Text>
            <Text style={[styles.tableCell, styles.col_codeNumber]}>CODE NUMBER</Text>
            <Text style={[styles.tableCell, styles.col_sku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.col_brand]}>BRAND AND TYPE</Text>
            <Text style={[styles.tableCell, styles.col_liters]}>LITERS</Text>
            <Text style={[styles.tableCell, styles.col_bottlePrice]}>BOTTLE PRICE</Text>
            <Text style={[styles.tableCell, styles.col_totalCost]}>TOTAL COST</Text>
          </View>

          {/* Table Rows */}
          {data.orderLines.map((line, index) => (
            <View key={index} style={[styles.tableRow, tableRowBorderStyle]}>
              <Text style={[styles.tableCell, styles.col_cases]}>{line.casesQuantity.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.col_bottles]}>{line.quantity}</Text>
              <Text style={[styles.tableCell, styles.col_size]}>{line.sku.size || 'N/A'}</Text>
              <Text style={[styles.tableCell, styles.col_codeNumber]}>{line.sku.abcCodeNumber || 'N/A'}</Text>
              <Text style={[styles.tableCell, styles.col_sku]}>{line.sku.code}</Text>
              <Text style={[styles.tableCell, styles.col_brand]}>{line.sku.product.name}</Text>
              <Text style={[styles.tableCell, styles.col_liters]}>{line.totalLiters.toFixed(3)}</Text>
              <Text style={[styles.tableCell, styles.col_bottlePrice]}>{formatCurrency(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.col_totalCost]}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Liters:</Text>
            <Text style={styles.totalValue}>{data.totalLiters.toFixed(3)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Date Received Signature */}
        <View style={[styles.signatureSection, styles.mt15]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DATE RECEIVED:</Text>
            <View style={styles.signatureField} />
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTermsBox}>
          <Text style={styles.legalText}>{data.collectionTerms}</Text>
        </View>
      </Page>

      {/* PAGE 2: Transportation and Compliance */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.page2Header}>Distributor's Wine Invoice - Page 2</Text>

        <View style={styles.invoiceHeader}>
          <Text style={styles.detailLabel}>Invoice Number: {data.invoiceNumber}</Text>
          <Text style={styles.detailLabel}>Customer: {data.customer.name}</Text>
        </View>

        {/* Transportation Section */}
        <View style={styles.transportationSection}>
          <Text style={[styles.detailLabel, styles.mb10]}>Transportation Company:</Text>
          <View style={styles.signatureField}>
            <Text style={styles.signatureLabel}>Company Name:</Text>
          </View>

          <View style={[styles.signatureGrid, styles.mt15]}>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Signed:</Text>
            </View>
            <View style={styles.signatureField}>
              <Text style={styles.signatureLabel}>Date:</Text>
            </View>
          </View>
        </View>

        {/* Extended Compliance Notice */}
        <View style={[styles.complianceNotice, styles.mt15]}>
          <Text>{data.complianceNotice}</Text>
        </View>

        {/* Additional Legal Text */}
        <View style={[styles.legalText, styles.mt15]}>
          <Text style={styles.bold}>IMPORTANT:</Text>
          <Text style={styles.mt5}>
            This invoice represents a tax-exempt sale to an out-of-state licensee.
            The distributor has verified the licensee's status and retained copies of
            all required documentation.
          </Text>
          <Text style={styles.mt5}>
            Excise taxes are not applicable to this sale per Virginia ABC regulations.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
