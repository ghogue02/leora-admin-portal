/**
 * VA ABC Tax-Exempt Invoice Template
 *
 * Used for: Virginia distributor → Out-of-state customer (no excise taxes)
 * Layout is now configurable via admin template settings.
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

  distributorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 20,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  invoiceCol: {
    flex: 1,
  },
  licenseeSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    width: 150,
    fontSize: 8,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 8,
  },
  paymentTermsBox: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  signatureBlock: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#000',
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
  totalsSection: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  noteBlock: {
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 7,
    lineHeight: 1.3,
  },
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
  sectionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  sectionColumn: {
    flex: 1,
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionLine: {
    fontSize: 8,
    marginBottom: 3,
  },
});

interface VAAbcTaxExemptInvoiceProps {
  data: CompleteInvoiceData;
}

type ColumnConfig = {
  id: InvoiceColumnId;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  enabled: boolean;
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'cases', label: 'Total Cases', width: 10, align: 'left', enabled: true },
  { id: 'totalBottles', label: 'Total Bottles', width: 10, align: 'left', enabled: true },
  { id: 'size', label: 'Size in Liters', width: 10, align: 'left', enabled: true },
  { id: 'abcCode', label: 'Code Number', width: 15, align: 'left', enabled: true },
  { id: 'sku', label: 'SKU', width: 10, align: 'left', enabled: true },
  { id: 'productName', label: 'Brand and Type', width: 25, align: 'left', enabled: true },
  { id: 'liters', label: 'Liters', width: 8, align: 'left', enabled: true },
  { id: 'bottlePrice', label: 'Price Each', width: 6, align: 'right', enabled: true },
  { id: 'lineTotal', label: 'Amount', width: 6, align: 'right', enabled: true },
];

const DEFAULT_SECTIONS = {
  showBillTo: true,
  showShipTo: true,
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

function renderLineValue(columnId: InvoiceColumnId, line: CompleteInvoiceData['orderLines'][number]) {
  switch (columnId) {
    case 'cases':
      return line.casesQuantity.toFixed(2);
    case 'totalBottles':
      return line.quantity;
    case 'size':
      return line.sku.size || '-';
    case 'abcCode':
      return line.sku.abcCodeNumber || '-';
    case 'sku':
    case 'code':
      return line.sku.code;
    case 'productName':
      return line.sku.product.name;
    case 'productCategory':
      return line.sku.product.category || '-';
    case 'description':
      return `${line.sku.product.name}${line.sku.product.category ? ` • ${line.sku.product.category}` : ''}`;
    case 'liters':
      return line.totalLiters.toFixed(2);
    case 'unitPrice':
    case 'bottlePrice':
      return formatCurrency(line.unitPrice);
    case 'lineTotal':
      return formatCurrency(line.lineTotal);
    case 'quantity':
      return line.quantity;
    default:
      return '';
  }
}

export const VAAbcTaxExemptInvoice: React.FC<VAAbcTaxExemptInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const layout = data.templateSettings?.layout;

  const sections = {
    ...DEFAULT_SECTIONS,
    ...(layout?.sections ?? {}),
  };
  const columns = parseColumns(layout?.columns);
  const headerNotes = groupNotes(layout?.headerNotes);

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
  const grandTotalBorderStyle = palette.borderColor
    ? { borderTopColor: palette.borderColor }
    : undefined;
  const sectionBuckets = layout
    ? getVisibleSectionBuckets(layout)
    : { headerLeft: [], headerRight: [], fullWidth: [] };
  const bodyBlockOrder = layout
    ? getBodyBlockOrder(layout)
    : (['totals', 'signature', 'compliance'] as InvoiceBodyBlockId[]);

  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        {renderNotesBlock(headerNotes.beforeHeader)}

        {/* Company Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.tenantName}</Text>
          <Text style={styles.companyAddress}>6781 Kennedy Road Suite 8, Warrenton, VA 20187</Text>
        </View>

        {renderNotesBlock(headerNotes.afterHeader)}

        {/* Title */}
        <Text style={styles.distributorTitle}>Distributor&apos;s Wine Invoice</Text>

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
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Salesperson:</Text>
              <Text style={styles.detailValue}>{data.salesperson}</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Licensee / Ship / Order sections */}
        <View style={styles.sectionGrid}>
          <View style={styles.sectionColumn}>
            {sectionBuckets.headerLeft.map((sectionKey) => (
              <View key={`left-${sectionKey}`} style={[styles.sectionCard, columnBorderStyle]}>
                {renderSectionBlock(sectionKey, data)}
              </View>
            ))}
          </View>
          <View style={styles.sectionColumn}>
            {sectionBuckets.headerRight.map((sectionKey) => (
              <View key={`right-${sectionKey}`} style={[styles.sectionCard, columnBorderStyle]}>
                {renderSectionBlock(sectionKey, data)}
              </View>
            ))}
          </View>
        </View>

        {sectionBuckets.fullWidth.map((sectionKey) => (
          <View key={`full-${sectionKey}`} style={[styles.sectionCard, columnBorderStyle, { marginBottom: 12 }]}>
            {renderSectionBlock(sectionKey, data, true)}
          </View>
        ))}

        {renderNotesBlock(headerNotes.beforeTable)}

        {/* Line Items Table */}
        <View style={styles.table}>
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
                  <Text style={styles.totalLabel}>Total Liters:</Text>
                  <Text style={styles.totalValue}>{data.totalLiters.toFixed(2)}</Text>
                </View>
                <View style={[styles.grandTotalRow, grandTotalBorderStyle]}>
                  <Text style={styles.grandTotalLabel}>Total Amount:</Text>
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

          if (blockId === 'compliance' && sections.showComplianceNotice) {
            return (
              <View key="compliance" style={styles.legalText}>
                <Text>{data.complianceNotice}</Text>
              </View>
            );
          }

          return null;
        })}

        {/* Payment Terms */}
        <View style={[styles.paymentTermsBox, sectionHeaderBackgroundStyle]}>
          <Text style={{ fontSize: 7 }}>
            Payment/Credit Applied: {formatCurrency(data.total)}
          </Text>
          <Text style={{ fontSize: 7 }}>
            Total Amount Due: {formatCurrency(data.total)}
          </Text>
        </View>
      </Page>

      {/* PAGE 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.page2Header}>Transportation and Compliance Information</Text>

        <Text style={{ fontSize: 8, marginBottom: 12 }}>
          This invoice certifies that the listed goods are being shipped in accordance with the transportation
          laws of the destination state. Retain this document for your compliance records.
        </Text>

        <View style={styles.transportationSection}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 6 }}>Transportation Log</Text>
          <Text style={{ fontSize: 7, marginBottom: 4 }}>
            Shipped via: {data.shippingMethod}
          </Text>
          <Text style={{ fontSize: 7, marginBottom: 4 }}>
            Ship Date: {formatShortDate(data.shipDate)}
          </Text>
          <Text style={{ fontSize: 7, marginBottom: 4 }}>
            Due Date: {formatShortDate(data.dueDate)}
          </Text>
          <Text style={{ fontSize: 7 }}>
            Compliance Notice: {data.complianceNotice}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

function renderSectionBlock(
  sectionKey: InvoiceSectionKey,
  data: CompleteInvoiceData,
  emphasize?: boolean,
) {
  switch (sectionKey) {
    case 'billTo':
      return (
        <>
          <Text style={styles.sectionTitle}>Licensee / Bill To</Text>
          <Text style={styles.sectionLine}>{data.customer.name}</Text>
          <Text style={styles.sectionLine}>
            License #: {data.customer.licenseNumber || 'N/A'}
          </Text>
          <Text style={styles.sectionLine}>
            {data.billingAddress.street1}
            {data.billingAddress.street2 && `, ${data.billingAddress.street2}`}
          </Text>
          <Text style={styles.sectionLine}>
            {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
          </Text>
          <Text style={styles.sectionLine}>PO #: {data.poNumber || 'N/A'}</Text>
        </>
      );
    case 'shipTo':
      return (
        <>
          <Text style={styles.sectionTitle}>Ship To</Text>
          <Text style={styles.sectionLine}>{data.customer.name}</Text>
          <Text style={styles.sectionLine}>
            {data.shippingAddress.street1}
            {data.shippingAddress.street2 && `, ${data.shippingAddress.street2}`}
          </Text>
          <Text style={styles.sectionLine}>
            {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
          </Text>
          <Text style={styles.sectionLine}>Shipping Method: {data.shippingMethod || 'N/A'}</Text>
        </>
      );
    case 'customerInfo':
      return (
        <>
          <Text style={styles.sectionTitle}>{emphasize ? 'Order Details' : 'Invoice Details'}</Text>
          <Text style={styles.sectionLine}>Invoice #: {data.invoiceNumber}</Text>
          <Text style={styles.sectionLine}>Invoice Date: {formatShortDate(data.issuedAt)}</Text>
          <Text style={styles.sectionLine}>Due Date: {formatShortDate(data.dueDate)}</Text>
          <Text style={styles.sectionLine}>Ship Date: {formatShortDate(data.shipDate)}</Text>
          {data.paymentTermsText && (
            <Text style={styles.sectionLine}>Terms: {data.paymentTermsText}</Text>
          )}
          {data.salesperson && (
            <Text style={styles.sectionLine}>Salesperson: {data.salesperson}</Text>
          )}
          {data.specialInstructions && (
            <Text style={styles.sectionLine}>Instructions: {data.specialInstructions}</Text>
          )}
        </>
      );
    default:
      return null;
  }
}
