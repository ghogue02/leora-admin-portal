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
  orderDetailsColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDetailsColumn: {
    flex: 1,
  },
  orderDetailsColumnSpacing: {
    marginRight: 18,
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
  showDeliveryInfo: true,
  showDistributorInfo: true,
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
    case 'customerInfo': {
      const detailItems: Array<{ label: string; value: string }> = [
        { label: 'Invoice #:', value: data.invoiceNumber || 'N/A' },
        {
          label: 'Invoice Date:',
          value: data.issuedAt ? formatShortDate(data.issuedAt) : 'N/A',
        },
        {
          label: 'Due Date:',
          value: data.dueDate ? formatShortDate(data.dueDate) : 'N/A',
        },
        {
          label: 'Ship Date:',
          value: formatShortDate(data.shipDate || data.issuedAt),
        },
      ];

      if (data.paymentTermsText) {
        detailItems.push({ label: 'Terms:', value: data.paymentTermsText });
      }
      if (data.shippingMethod) {
        detailItems.push({ label: 'Ship Method:', value: data.shippingMethod });
      }
      if (data.customerDeliveryWindows?.length) {
        detailItems.push({ label: 'Preferred Windows:', value: data.customerDeliveryWindows.join(', ') });
      }
      if (data.specialInstructions) {
        detailItems.push({ label: 'Order Notes:', value: data.specialInstructions });
      }
      if (data.poNumber) {
        detailItems.push({ label: 'PO Number:', value: data.poNumber });
      }
      if (data.salesperson) {
        detailItems.push({ label: 'Salesperson:', value: data.salesperson });
      }

      const midpoint = Math.ceil(detailItems.length / 2);
      const firstColumn = detailItems.slice(0, midpoint);
      const secondColumn = detailItems.slice(midpoint);

      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Order Details</Text>
          <View style={styles.orderDetailsColumns}>
            <View
              style={[
                styles.orderDetailsColumn,
                secondColumn.length > 0 ? styles.orderDetailsColumnSpacing : undefined,
              ]}
            >
              {firstColumn.map((detail) => (
                <View key={detail.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue}>{detail.value}</Text>
                </View>
              ))}
            </View>
            {secondColumn.length > 0 && (
              <View style={styles.orderDetailsColumn}>
                {secondColumn.map((detail) => (
                  <View key={detail.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      );
    }
    case 'deliveryInfo': {
      const detailItems: Array<{ label: string; value: string }> = [];

      if (data.orderDeliveryDate) {
        detailItems.push({
          label: 'Delivery Date:',
          value: formatShortDate(data.orderDeliveryDate),
        });
      }
      if (data.orderDeliveryTimeWindow) {
        detailItems.push({
          label: 'Delivery Window:',
          value: data.orderDeliveryTimeWindow,
        });
      } else if (data.customerDeliveryWindows?.length) {
        detailItems.push({
          label: 'Preferred Windows:',
          value: data.customerDeliveryWindows.join(', '),
        });
      }
      if (data.orderWarehouseLocation) {
        detailItems.push({
          label: 'Warehouse:',
          value: data.orderWarehouseLocation,
        });
      }
      if (data.customerDeliveryInstructions) {
        detailItems.push({
          label: 'Instructions:',
          value: data.customerDeliveryInstructions,
        });
      }
      if (!detailItems.length) {
        detailItems.push({
          label: 'Delivery Status:',
          value: 'Scheduling pending',
        });
      }

      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Delivery Details</Text>
          {detailItems.map((detail) => (
            <View key={detail.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </>
      );
    }
    case 'distributorInfo': {
      const detailItems: Array<{ label: string; value: string }> = [
        { label: 'Distributor:', value: data.tenantName },
      ];

      if (data.wholesalerLicenseNumber) {
        detailItems.push({
          label: 'License #:',
          value: data.wholesalerLicenseNumber,
        });
      }
      if (data.wholesalerPhone) {
        detailItems.push({
          label: 'Phone:',
          value: data.wholesalerPhone,
        });
      }
      const companyWebsite = data.templateSettings?.options?.companyWebsite;
      if (companyWebsite) {
        detailItems.push({
          label: 'Website:',
          value: companyWebsite,
        });
      }

      const contactLines = data.templateSettings?.options?.companyContactLines ?? [];
      contactLines
        .filter((line): line is string => Boolean(line && line.trim().length))
        .forEach((line, index) => {
          detailItems.push({
            label: index === 0 ? 'Contact:' : '',
            value: line,
          });
        });

      return (
        <>
          <Text style={[styles.columnHeader, columnHeaderBackgroundStyle]}>Distributor Info</Text>
          {detailItems.map((detail, index) => (
            <View key={`${detail.label}-${detail.value}-${index}`} style={styles.detailRow}>
              {detail.label ? <Text style={styles.detailLabel}>{detail.label}</Text> : <Text style={styles.detailLabel} />}
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </>
      );
    }
    default:
      return null;
  }
}

export const VAAbcInstateInvoice: React.FC<VAAbcInstateInvoiceProps> = ({ data }) => {
  const palette = data.templateSettings?.palette ?? {};
  const options = data.templateSettings?.options ?? {};
  const layout = data.templateSettings?.layout;
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
            {!!logoUrl && (
              <Image
                src={logoUrl}
                style={{ height: 56, width: 56, marginBottom: 6, objectFit: 'contain' }}
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
            {branding.website && (
              <Text style={styles.wholesalerInfo}>{branding.website}</Text>
            )}
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
            const complianceText = data.complianceNotice?.trim();
            const legalText = data.collectionTerms?.trim()
              || `Accounts not paid on-time in accordance with the above due date are subject to ${data.interestRate
                  .times(100)
                  .toFixed(1)}% finance charges.`;

            const showLegalLine = legalText
              && (!complianceText || legalText.toLowerCase() !== complianceText.toLowerCase());

            const fallbackFooter: string[] = [];
            if (complianceText) fallbackFooter.push(complianceText);
            if (showLegalLine && legalText) fallbackFooter.push(legalText);

            const footerLines = resolveFooterNotes(
              data.templateSettings?.options?.footerNotes,
              fallbackFooter
            );
            const uniqueFooterLines = [...new Set(footerLines.map((line) => line.trim()))].filter((line) => line.length);

            return (
              <View key="compliance" style={styles.complianceNotice}>
                {uniqueFooterLines.map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
              </View>
            );
          }

          return null;
        })}
      </Page>
    </Document>
  );
};
