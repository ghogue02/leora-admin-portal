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

import type { InvoiceColumnId } from '../column-presets';
import type { InvoiceBodyBlockId, InvoiceSectionKey } from '../template-settings';
import { getBodyBlockOrder, getVisibleSectionBuckets } from '../layout-utils';

const styles = StyleSheet.create({
  ...sharedStyles,
  noteBlock: {
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 8,
    lineHeight: 1.3,
  },
  sectionBlock: {
    marginTop: 10,
  },
  signatureBlock: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  signatureLine: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#000',
    width: '60%',
  },
});

type ColumnConfig = {
  id: InvoiceColumnId;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  enabled: boolean;
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'quantity', label: 'Quantity', width: 12, align: 'left', enabled: true },
  { id: 'sku', label: 'SKU', width: 16, align: 'left', enabled: true },
  { id: 'productName', label: 'Description', width: 40, align: 'left', enabled: true },
  { id: 'unitPrice', label: 'Unit Price', width: 15, align: 'right', enabled: true },
  { id: 'lineTotal', label: 'Amount', width: 17, align: 'right', enabled: true },
];

const DEFAULT_SECTIONS = {
  showBillTo: true,
  showShipTo: false,
  showCustomerInfo: true,
  showTotals: true,
  showSignature: false,
  showComplianceNotice: true,
};

type HeaderNote = {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
  position: 'beforeHeader' | 'afterHeader' | 'beforeTable' | 'afterTable';
};

function parseColumns(columns?: ColumnConfig[] | null): ColumnConfig[] {
  if (!columns || columns.length === 0) {
    return DEFAULT_COLUMNS;
  }
  return columns
    .map((column) => ({
      ...column,
      align: column.align ?? 'left',
    }))
    .filter((column) => column.enabled !== false);
}

function groupNotes(notes: HeaderNote[] | undefined) {
  const enabledNotes = (notes ?? []).filter((note) => note.enabled && note.text.trim().length);
  return {
    beforeHeader: enabledNotes.filter((note) => note.position === 'beforeHeader'),
    afterHeader: enabledNotes.filter((note) => note.position === 'afterHeader'),
    beforeTable: enabledNotes.filter((note) => note.position === 'beforeTable'),
    afterTable: enabledNotes.filter((note) => note.position === 'afterTable'),
  };
}

function renderLineValue(columnId: InvoiceColumnId, line: CompleteInvoiceData['orderLines'][number]) {
  switch (columnId) {
    case 'quantity':
      return line.quantity;
    case 'cases':
      return line.casesQuantity.toFixed(2);
    case 'totalBottles':
      return line.quantity;
    case 'size':
      return line.sku.size || '-';
    case 'code':
      return line.sku.code;
    case 'abcCode':
      return line.sku.abcCodeNumber || '-';
    case 'sku':
      return line.sku.code;
    case 'productName':
      return `${line.sku.product.name}${line.sku.size ? ` (${line.sku.size})` : ''}`;
    case 'productCategory':
      return line.sku.product.category || '-';
    case 'description':
      return `${line.sku.product.name}${line.sku.product.category ? ` • ${line.sku.product.category}` : ''}`;
    case 'liters':
      return line.totalLiters.toFixed(2);
    case 'unitPrice':
      return formatCurrency(line.unitPrice);
    case 'bottlePrice':
      return formatCurrency(line.unitPrice);
    case 'lineTotal':
      return formatCurrency(line.lineTotal);
    default:
      return '';
  }
}

function renderNotesBlock(notes: HeaderNote[]) {
  if (!notes.length) {
    return null;
  }
  return (
    <View style={styles.noteBlock}>
      {notes.map((note) => (
        <Text key={note.id}>{note.text}</Text>
      ))}
    </View>
  );
}

interface StandardInvoiceProps {
  data: CompleteInvoiceData;
}

export const StandardInvoice: React.FC<StandardInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const layout = data.templateSettings?.layout;
  const sections = {
    ...DEFAULT_SECTIONS,
    ...(layout?.sections ?? {}),
  };
  const columns = parseColumns(layout?.columns);
  const headerNotes = groupNotes(layout?.headerNotes);
  const sectionBuckets = layout
    ? getVisibleSectionBuckets(layout)
    : { headerLeft: [], headerRight: [], fullWidth: [] };
  const bodyBlockOrder = layout
    ? getBodyBlockOrder(layout)
    : (['totals', 'signature', 'compliance'] as InvoiceBodyBlockId[]);

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
        {renderNotesBlock(headerNotes.beforeHeader)}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.tenantName}</Text>
          <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8, Warrenton, VA 20187</Text>
          {data.wholesalerPhone && (
            <Text style={styles.companyAddress}>Phone: {data.wholesalerPhone}</Text>
          )}
        </View>

        {renderNotesBlock(headerNotes.afterHeader)}

        {/* Title */}
        <Text style={styles.title}>Invoice</Text>

        {/* Invoice Details & Header Sections */}
        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoColumn}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{data.invoiceNumber}</Text>

            <Text style={[styles.label, styles.mt10]}>Invoice Date</Text>
            <Text style={styles.value}>{formatShortDate(data.issuedAt)}</Text>

            <Text style={[styles.label, styles.mt10]}>Due Date</Text>
            <Text style={styles.value}>{formatShortDate(data.dueDate)}</Text>

            {sectionBuckets.headerLeft.map((sectionKey) => (
              <View key={sectionKey} style={styles.sectionBlock}>
                {renderSectionBlock(sectionKey, data, sections)}
              </View>
            ))}
          </View>

          {sectionBuckets.headerRight.length > 0 && (
            <View style={styles.invoiceInfoColumn}>
              {sectionBuckets.headerRight.map((sectionKey) => (
                <View key={sectionKey} style={styles.sectionBlock}>
                  {renderSectionBlock(sectionKey, data, sections)}
                </View>
              ))}
            </View>
          )}
        </View>

        {sectionBuckets.fullWidth.map((sectionKey) => (
          <View key={sectionKey} style={[styles.sectionBlock, styles.orderDetails]}>
            {renderSectionBlock(sectionKey, data, sections)}
          </View>
        ))}

        {renderNotesBlock(headerNotes.beforeTable)}

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableHeader, tableHeaderBackgroundStyle]}>
            {columns.map((column) => (
              <Text
                key={column.id}
                style={[
                  styles.tableCell,
                  {
                    width: `${column.width}%`,
                    textAlign: column.align,
                  },
                ]}
              >
                {column.label}
              </Text>
            ))}
          </View>

          {/* Rows */}
          {data.orderLines.map((line, index) => (
            <View key={index} style={[styles.tableRow, tableRowBorderStyle]}>
              {columns.map((column) => (
                <Text
                  key={column.id}
                  style={[
                    styles.tableCell,
                    {
                      width: `${column.width}%`,
                      textAlign: column.align,
                    },
                  ]}
                >
                  {renderLineValue(column.id, line)}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {renderNotesBlock(headerNotes.afterTable)}

        {bodyBlockOrder.map((blockId) => {
          if (blockId === 'totals' && sections.showTotals) {
            return (
              <View key="totals" style={styles.totalsSection}>
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
                <View style={[styles.grandTotalRow, grandTotalBorderStyle]}>
                  <Text style={styles.grandTotalLabel}>Total:</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
                </View>
              </View>
            );
          }

          if (blockId === 'signature' && sections.showSignature) {
            return (
              <View key="signature" style={styles.signatureBlock}>
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            );
          }

          if (blockId === 'compliance' && sections.showComplianceNotice && data.collectionTerms) {
            return (
              <View key="compliance" style={styles.legalText}>
                <Text>{data.collectionTerms}</Text>
              </View>
            );
          }

          return null;
        })}
      </Page>
    </Document>
  );
};

function renderSectionBlock(
  sectionKey: InvoiceSectionKey,
  data: CompleteInvoiceData,
  sections: typeof DEFAULT_SECTIONS,
) {
  switch (sectionKey) {
    case 'billTo':
      return (
        <>
          <Text style={styles.label}>Bill To</Text>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.customerAddress}>
            {data.billingAddress.street1}
            {data.billingAddress.street2 && `\n${data.billingAddress.street2}`}
          </Text>
          <Text style={styles.customerAddress}>
            {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
          </Text>
        </>
      );
    case 'shipTo':
      return (
        <>
          <Text style={styles.label}>Ship To</Text>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.customerAddress}>
            {data.shippingAddress.street1}
            {data.shippingAddress.street2 && `\n${data.shippingAddress.street2}`}
          </Text>
          <Text style={styles.customerAddress}>
            {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
          </Text>
        </>
      );
    case 'customerInfo':
      if (!sections.showCustomerInfo) {
        return null;
      }
      return (
        <>
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
        </>
      );
    default:
      return null;
  }
}
