/**
 * VA ABC In-State Invoice Template - Condensed
 *
 * Optimized to fit 10-line orders on 1 page. Shares layout config options with the full version.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { CompleteInvoiceData } from '../invoice-data-builder';
import { sharedStyles, formatCurrency, formatShortDate } from './styles';
import type { InvoiceColumnId } from '../column-presets';
import type { InvoiceBodyBlockId, InvoiceSectionKey } from '../template-settings';
import { getBodyBlockOrder, getVisibleSectionBuckets } from '../layout-utils';
import { resolveFooterNotes } from '../footer-notes';
import { resolveBrandingProfile } from '../branding';

const styles = StyleSheet.create({
  ...sharedStyles,

  // Condensed overrides
  page: {
    padding: 20,
    fontSize: 7,
    lineHeight: 1.2,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  headerLeft: {
    flex: 2,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  companySubtitle: {
    fontSize: 7,
    marginBottom: 1,
  },
  companyAddress: {
    fontSize: 7,
    marginBottom: 0.5,
  },
  wholesalerInfo: {
    fontSize: 7,
    marginBottom: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },

  threeColumnSection: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 10,
  },
  column: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#ccc',
    padding: 5,
    backgroundColor: '#fff',
  },
  columnHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 2,
  },
  customerName: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 6,
    marginBottom: 1,
  },
  customerIdBox: {
    borderWidth: 0.5,
    borderColor: '#000',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  customerIdLabel: {
    fontSize: 6,
    marginBottom: 2,
  },
  customerId: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  orderDetails: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  detailLabel: {
    width: 80,
    fontSize: 6,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 6,
  },

  retailerSignature: {
    marginTop: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  retailerHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  signatureField: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  signatureLabel: {
    fontSize: 6,
  },

  complianceNotice: {
    marginTop: 4,
    padding: 3,
    backgroundColor: '#f9f9f9',
    borderWidth: 0.5,
    borderColor: '#ccc',
  },

  legalText: {
    marginTop: 4,
    fontSize: 5,
    color: '#666',
  },

  noteBlock: {
    marginBottom: 8,
    padding: 4,
    borderWidth: 0.5,
    borderColor: '#ccc',
    fontSize: 5,
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
  { id: 'quantity', label: 'Bottles', width: 8, align: 'left', enabled: true },
  { id: 'size', label: 'Size', width: 8, align: 'left', enabled: true },
  { id: 'abcCode', label: 'Code', width: 10, align: 'left', enabled: true },
  { id: 'sku', label: 'SKU', width: 10, align: 'left', enabled: true },
  { id: 'productName', label: 'Brand & Type', width: 38, align: 'left', enabled: true },
  { id: 'liters', label: 'Liters', width: 10, align: 'left', enabled: true },
  { id: 'unitPrice', label: 'Price', width: 10, align: 'right', enabled: true },
  { id: 'lineTotal', label: 'Amount', width: 12, align: 'right', enabled: true },
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
      return line.totalLiters.toFixed(2);
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
            {data.billingAddress.street2 && `, ${data.billingAddress.street2}`}
          </Text>
          <Text style={styles.customerAddress}>
            {data.billingAddress.city}, {data.billingAddress.state} {data.billingAddress.postalCode}
          </Text>
        </>
      );
    case 'shipTo':
      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Ship To</Text>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.customerAddress}>
            {data.shippingAddress.street1}
            {data.shippingAddress.street2 && `, ${data.shippingAddress.street2}`}
          </Text>
          <Text style={styles.customerAddress}>
            {data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
          </Text>
        </>
      );
    case 'customerInfo':
      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Invoice</Text>
          <Text style={styles.customerAddress}>Invoice #: {data.invoiceNumber}</Text>
          <Text style={styles.customerAddress}>Invoice Date: {formatShortDate(data.issuedAt)}</Text>
          <Text style={styles.customerAddress}>Due Date: {formatShortDate(data.dueDate)}</Text>
          {data.poNumber && (
            <Text style={styles.customerAddress}>PO Number: {data.poNumber}</Text>
          )}
          {data.salesperson && (
            <Text style={styles.customerAddress}>Salesperson: {data.salesperson}</Text>
          )}
          {data.shippingMethod && (
            <Text style={styles.customerAddress}>Ship Method: {data.shippingMethod}</Text>
          )}
          {data.paymentTermsText && (
            <Text style={styles.customerAddress}>Terms: {data.paymentTermsText}</Text>
          )}
        </>
      );
    default:
      return null;
  }
}

export const VAAbcInstateInvoiceCondensed: React.FC<VAAbcInstateInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const layout = data.templateSettings?.layout;
  const sections = {
    ...DEFAULT_SECTIONS,
    ...(layout?.sections ?? {}),
  };
  const options = data.templateSettings?.options ?? {};
  const branding = resolveBrandingProfile(options, {
    name: data.tenantName,
    licenseText: data.wholesalerLicenseNumber
      ? `VA ABC Wholesale #${data.wholesalerLicenseNumber}`
      : undefined,
    contactLines: [
      data.wholesalerLicenseNumber ? `Wholesaler #: ${data.wholesalerLicenseNumber}` : null,
      data.wholesalerPhone ? `Voice: ${data.wholesalerPhone}` : null,
    ].filter((line): line is string => Boolean(line)),
    website: options.companyWebsite ?? undefined,
  });
  const columns = parseColumns(layout?.columns);
  const headerNotes = groupNotes(layout?.headerNotes);

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
  const showCustomerIdColumn = options.showCustomerIdColumn ?? true;
  const sectionBuckets = layout
    ? getVisibleSectionBuckets(layout)
    : { headerLeft: [], headerRight: [], fullWidth: [] };
  const bodyBlockOrder = layout
    ? getBodyBlockOrder(layout)
    : (['totals', 'signature', 'compliance'] as InvoiceBodyBlockId[]);
  const complianceText = data.complianceNotice?.trim();
  const legalText = data.collectionTerms?.trim();
  const fallbackFooter: string[] = [];
  if (legalText) {
    fallbackFooter.push(legalText);
  } else {
    fallbackFooter.push(`${data.interestRate.times(100).toFixed(1)}% finance charge on late payments.`);
  }
  if (complianceText && (!legalText || legalText.toLowerCase() !== complianceText.toLowerCase())) {
    fallbackFooter.push(complianceText);
  }
  const footerLines = resolveFooterNotes(data.templateSettings?.options?.footerNotes, fallbackFooter);
  const uniqueFooterLines = [...new Set(footerLines.map((line) => line.trim()))].filter((line) => line.length);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderNotesBlock(headerNotes.beforeHeader)}

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {!!options.logoUrl && (
              <Image
                src={options.logoUrl}
                style={{ height: 40, width: 40, marginBottom: 4, objectFit: 'contain' }}
              />
            )}
            <Text style={styles.companyName}>{branding.name}</Text>
            {branding.secondary && <Text style={styles.companySubtitle}>{branding.secondary}</Text>}
            {branding.tagline && <Text style={styles.companySubtitle}>{branding.tagline}</Text>}
            {branding.addressLines.map((line) => (
              <Text key={line} style={styles.companyAddress}>{line}</Text>
            ))}
            {branding.licenseText && <Text style={styles.companyAddress}>{branding.licenseText}</Text>}
          </View>
          <View style={styles.headerRight}>
            {branding.contactLines.map((line) => (
              <Text key={line} style={styles.wholesalerInfo}>
                {line}
              </Text>
            ))}
            {branding.website && <Text style={styles.wholesalerInfo}>{branding.website}</Text>}
          </View>
        </View>

        {renderNotesBlock(headerNotes.afterHeader)}

        {/* Title */}
        <View style={styles.mb15}>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        {/* Bill / Ship sections */}
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
              <View style={[styles.customerIdBox, columnBorderStyle]}>
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
                  <Text style={styles.totalValue}>{data.totalLiters.toFixed(2)}</Text>
                </View>
                <View style={[styles.grandTotalRow, grandTotalBorderStyle]}>
                  <Text style={styles.grandTotalLabel}>Total:</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
                </View>
              </View>
            );
          }

          if (blockId === 'signature' && sections.showSignature) {
            return (
              <View key="signature" style={styles.retailerSignature}>
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
            );
          }

          if (blockId === 'compliance' && sections.showComplianceNotice) {
            return (
              <View key="compliance" style={styles.complianceNotice}>
                {uniqueFooterLines.map((line) => (
                  <Text key={line} style={{ fontSize: 5 }}>
                    {line}
                  </Text>
                ))}
              </View>
            );
          }

          return null;
        })}

        {/* Footer already rendered within compliance block; avoid duplicating legal text */}
      </Page>
    </Document>
  );
};
