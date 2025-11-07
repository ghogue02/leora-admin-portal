/**
 * VA ABC In-State Invoice Template
 *
 * Format: Total Wine / VA ABC Required Format
 * Used for: Virginia distributor → Virginia customer (excise taxes paid)
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

  noteBlock: {
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 7,
    lineHeight: 1.3,
  },
});

interface VAAbcInstateInvoiceProps {
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
  { id: 'quantity', label: 'No. bottles', width: 10, align: 'left', enabled: true },
  { id: 'size', label: 'Size', width: 9, align: 'left', enabled: true },
  { id: 'abcCode', label: 'Code', width: 12, align: 'left', enabled: true },
  { id: 'sku', label: 'SKU', width: 10, align: 'left', enabled: true },
  { id: 'productName', label: 'Brand & type', width: 35, align: 'left', enabled: true },
  { id: 'liters', label: 'Liters', width: 10, align: 'left', enabled: true },
  { id: 'unitPrice', label: 'Unit price', width: 7, align: 'right', enabled: true },
  { id: 'lineTotal', label: 'Amount', width: 7, align: 'right', enabled: true },
];

const DEFAULT_SECTIONS = {
  showBillTo: true,
  showShipTo: true,
  showCustomerInfo: true,
  showTotals: true,
  showSignature: true,
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
    case 'quantity':
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
      return `${line.sku.product.name}${line.sku.size ? ` (${line.sku.size})` : ''}`;
    case 'liters':
      return line.totalLiters.toFixed(3);
    case 'unitPrice':
    case 'bottlePrice':
      return formatCurrency(line.unitPrice);
    case 'lineTotal':
      return formatCurrency(line.lineTotal);
    case 'cases':
      return line.casesQuantity.toFixed(2);
    case 'totalBottles':
      return line.quantity;
    default:
      return '';
  }
}

function renderCustomerSection(
  sectionKey: InvoiceSectionKey,
  data: CompleteInvoiceData,
  columnHeaderBackgroundStyle?: Record<string, unknown>,
) {
  switch (sectionKey) {
    case 'billTo':
      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Bill To</Text>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.customerAddress}>
            {data.billingAddress.street1}
            {data.billingAddress.street2 && `\n${data.billingAddress.street2}`}
          </Text>
          <Text style={styles.customerAddress}>
            {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
          </Text>
          {data.customer.phone && <Text style={styles.customerAddress}>{data.customer.phone}</Text>}
          {data.customer.billingEmail && (
            <Text style={styles.customerAddress}>{data.customer.billingEmail}</Text>
          )}
        </>
      );
    case 'shipTo':
      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Ship To</Text>
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
      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Order Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice #:</Text>
            <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.issuedAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.dueDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ship Date:</Text>
            <Text style={styles.detailValue}>{formatShortDate(data.shipDate || data.issuedAt)}</Text>
          </View>
          {data.paymentTermsText && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Terms:</Text>
              <Text style={styles.detailValue}>{data.paymentTermsText}</Text>
            </View>
          )}
          {data.shippingMethod && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ship Method:</Text>
              <Text style={styles.detailValue}>{data.shippingMethod}</Text>
            </View>
          )}
          {data.specialInstructions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Instructions:</Text>
              <Text style={styles.detailValue}>{data.specialInstructions}</Text>
            </View>
          )}
          {data.poNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PO Number:</Text>
              <Text style={styles.detailValue}>{data.poNumber}</Text>
            </View>
          )}
          {data.salesperson && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Salesperson:</Text>
              <Text style={styles.detailValue}>{data.salesperson}</Text>
            </View>
          )}
        </>
      );
    default:
      return null;
  }
}

export const VAAbcInstateInvoice: React.FC<VAAbcInstateInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const options = data.templateSettings?.options ?? {};
  const layout = data.templateSettings?.layout;

  const sections = {
    ...DEFAULT_SECTIONS,
    ...(layout?.sections ?? {}),
  };
  const columns = parseColumns(layout?.columns);
  const headerNotes = groupNotes(layout?.headerNotes);

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
  const sectionBuckets = layout
    ? getVisibleSectionBuckets(layout)
    : { headerLeft: [], headerRight: [], fullWidth: [] };
  const bodyBlockOrder = layout
    ? getBodyBlockOrder(layout)
    : (['totals', 'signature', 'compliance'] as InvoiceBodyBlockId[]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderNotesBlock(headerNotes.beforeHeader)}

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

        {renderNotesBlock(headerNotes.afterHeader)}

        {/* Invoice Title */}
        <View style={styles.mb15}>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        {/* Customer section layout */}
        <View style={styles.threeColumnSection}>
          {sectionBuckets.headerLeft.length > 0 && (
            <View style={[styles.column, columnBorderStyle]}>
              {sectionBuckets.headerLeft.map((sectionKey) => (
                <View key={sectionKey}>
                  {renderCustomerSection(sectionKey, data, columnHeaderBackgroundStyle)}
                </View>
              ))}
            </View>
          )}

          {showCustomerIdColumn && (
            <View style={[styles.column, columnBorderStyle]}>
              <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Customer ID</Text>
              <View style={[styles.customerIdBox, customerIdBoxBorderStyle]}>
                <Text style={styles.customerIdLabel}>ID</Text>
                <Text style={styles.customerId}>{data.customer.accountNumber || data.customer.id.substring(0, 8)}</Text>
              </View>
            </View>
          )}

          {sectionBuckets.headerRight.length > 0 && (
            <View style={[styles.column, columnBorderStyle]}>
              {sectionBuckets.headerRight.map((sectionKey) => (
                <View key={sectionKey}>
                  {renderCustomerSection(sectionKey, data, columnHeaderBackgroundStyle)}
                </View>
              ))}
            </View>
          )}
        </View>

        {sectionBuckets.fullWidth.map((sectionKey) => (
          <View key={sectionKey} style={styles.orderDetails}>
            {renderCustomerSection(sectionKey, data)}
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
                  <Text style={styles.totalValue}>{data.totalLiters.toFixed(3)}</Text>
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
              <View key="signature" style={styles.retailerSignature}>
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
            );
          }

          if (blockId === 'compliance' && sections.showComplianceNotice) {
            return (
              <View key="compliance" style={styles.complianceNotice}>
                <Text>{data.complianceNotice}</Text>
              </View>
            );
          }

          return null;
        })}

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
