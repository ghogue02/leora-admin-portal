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
import { resolveFooterNotes } from '../footer-notes';
import { resolveBrandingProfile } from '../branding';

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
  detailColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailColumn: {
    flex: 1,
  },
  detailColumnSpacing: {
    marginRight: 12,
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
  showDeliveryInfo: true,
  showDistributorInfo: true,
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
  const options = data.templateSettings?.options ?? {};
  const branding = resolveBrandingProfile(options, {
    name: data.tenantName,
    licenseText: data.wholesalerLicenseNumber
      ? `VA ABC Wholesale #${data.wholesalerLicenseNumber}`
      : undefined,
    contactLines: [
      data.wholesalerPhone ? `Voice: ${data.wholesalerPhone}` : null,
    ].filter((line): line is string => Boolean(line)),
  });

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
  const fallbackFooter: string[] = [];
  if (data.complianceNotice?.trim()) {
    fallbackFooter.push(data.complianceNotice.trim());
  }
  if (data.collectionTerms?.trim()) {
    if (
      !fallbackFooter.length
      || fallbackFooter[0].toLowerCase() !== data.collectionTerms.trim().toLowerCase()
    ) {
      fallbackFooter.push(data.collectionTerms.trim());
    }
  }
  const footerLines = resolveFooterNotes(data.templateSettings?.options?.footerNotes, fallbackFooter);
  const uniqueFooterLines = [...new Set(footerLines.map((line) => line.trim()))].filter((line) => line.length);

  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        {renderNotesBlock(headerNotes.beforeHeader)}

        {/* Company Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{branding.name}</Text>
          {branding.secondary && <Text style={styles.companyAddress}>{branding.secondary}</Text>}
          {branding.tagline && <Text style={styles.companyAddress}>{branding.tagline}</Text>}
          {branding.addressLines.map((line) => (
            <Text key={line} style={styles.companyAddress}>{line}</Text>
          ))}
          {branding.licenseText && <Text style={styles.companyAddress}>{branding.licenseText}</Text>}
          {branding.contactLines.map((line) => (
            <Text key={line} style={styles.companyAddress}>{line}</Text>
          ))}
          {branding.website && <Text style={styles.companyAddress}>{branding.website}</Text>}
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
                {uniqueFooterLines.map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
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
          {uniqueFooterLines.join(' ')}
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
            Compliance Notice: {uniqueFooterLines.join(' ')}
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
          value: data.shipDate ? formatShortDate(data.shipDate) : formatShortDate(data.issuedAt),
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
          <Text style={styles.sectionTitle}>{emphasize ? 'Order Details' : 'Invoice Details'}</Text>
          <View style={styles.detailColumns}>
            <View
              style={[
                styles.detailColumn,
                secondColumn.length > 0 ? styles.detailColumnSpacing : undefined,
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
              <View style={styles.detailColumn}>
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
        detailItems.push({ label: 'Delivery Date:', value: formatShortDate(data.orderDeliveryDate) });
      }
      if (data.orderDeliveryTimeWindow) {
        detailItems.push({ label: 'Delivery Window:', value: data.orderDeliveryTimeWindow });
      } else if (data.customerDeliveryWindows?.length) {
        detailItems.push({
          label: 'Preferred Windows:',
          value: data.customerDeliveryWindows.join(', '),
        });
      }
      if (data.orderWarehouseLocation) {
        detailItems.push({ label: 'Warehouse:', value: data.orderWarehouseLocation });
      }
      if (data.customerDeliveryInstructions) {
        detailItems.push({ label: 'Instructions:', value: data.customerDeliveryInstructions });
      }
      if (!detailItems.length) {
        detailItems.push({ label: 'Delivery Status:', value: 'Pending scheduling' });
      }

      return (
        <>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
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
          <Text style={styles.sectionTitle}>Distributor Info</Text>
          {detailItems.map((detail, index) => (
            <View key={`${detail.label}-${detail.value}-${index}`} style={styles.detailRow}>
              {detail.label ? (
                <Text style={styles.detailLabel}>{detail.label}</Text>
              ) : (
                <Text style={styles.detailLabel} />
              )}
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
