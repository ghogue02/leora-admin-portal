/**
 * Standard Invoice Template
 *
 * Simple invoice format for non-VA customers or general use
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

  col_qty: { width: '10%' },
  col_sku: { width: '15%' },
  col_description: { width: '40%' },
  col_price: { width: '15%', textAlign: 'right' },
  col_amount: { width: '20%', textAlign: 'right' },
});

interface StandardInvoiceProps {
  data: CompleteInvoiceData;
}

export const StandardInvoice: React.FC<StandardInvoiceProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.tenantName}</Text>
          <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8, Warrenton, VA 20187</Text>
          {data.wholesalerPhone && (
            <Text style={styles.companyAddress}>Phone: {data.wholesalerPhone}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>Invoice</Text>

        {/* Invoice Details and Customer Info */}
        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoColumn}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{data.invoiceNumber}</Text>

            <Text style={[styles.label, styles.mt10]}>Invoice Date</Text>
            <Text style={styles.value}>{formatShortDate(data.issuedAt)}</Text>

            <Text style={[styles.label, styles.mt10]}>Due Date</Text>
            <Text style={styles.value}>{formatShortDate(data.dueDate)}</Text>
          </View>

          <View style={styles.invoiceInfoColumn}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.street1}
              {data.billingAddress.street2 && `\n${data.billingAddress.street2}`}
            </Text>
            <Text style={styles.customerAddress}>
              {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
            </Text>
          </View>
        </View>

        {/* Order Details */}
        {(data.salesperson || data.poNumber) && (
          <View style={[styles.orderDetails, styles.mb15]}>
            {data.salesperson && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Salesperson:</Text>
                <Text style={styles.detailValue}>{data.salesperson}</Text>
              </View>
            )}
            {data.poNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PO Number:</Text>
                <Text style={styles.detailValue}>{data.poNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.col_qty]}>Quantity</Text>
            <Text style={[styles.tableCell, styles.col_sku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.col_description]}>Description</Text>
            <Text style={[styles.tableCell, styles.col_price]}>Unit Price</Text>
            <Text style={[styles.tableCell, styles.col_amount]}>Amount</Text>
          </View>

          {/* Rows */}
          {data.orderLines.map((line, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col_qty]}>{line.quantity}</Text>
              <Text style={[styles.tableCell, styles.col_sku]}>{line.sku.code}</Text>
              <Text style={[styles.tableCell, styles.col_description]}>
                {line.sku.product.name}
                {line.sku.size && ` (${line.sku.size})`}
              </Text>
              <Text style={[styles.tableCell, styles.col_price]}>{formatCurrency(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.col_amount]}>{formatCurrency(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          {data.totalTax.greaterThan(0) && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.totalTax)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Payment Terms */}
        {data.collectionTerms && (
          <View style={styles.legalText}>
            <Text>{data.collectionTerms}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
