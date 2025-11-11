import { stringify } from 'csv-stringify/sync';
import { formatDateForSAGE } from '@/lib/dates';

const DEFAULT_GL_ACCOUNT = '40000';

export interface InventoryAdjustmentRow {
  'Invoice date': string;
  'HAL CUSTOMER': string;
  Invoice: string;
  Item: string;
  'Qty.': number;
  'Unit price': string;
  'Net price': string;
  SKU: string;
  'G/L Account': string;
}

export interface InventoryAdjustmentOrder {
  id: string;
  orderedAt: Date | null;
  customer: {
    name: string | null;
  } | null;
  invoices: Array<{
    invoiceNumber: string | null;
    issuedAt: Date | null;
  }>;
  lines: Array<{
    quantity: number;
    unitPrice: unknown;
    sku: {
      code: string;
      product: {
        name: string;
      } | null;
    } | null;
  }>;
}

function normalizeMoney(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in (value as Record<string, unknown>)) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toCurrencyString(value: number): string {
  return value.toFixed(2);
}

export function orderToInventoryAdjustmentRows(
  order: InventoryAdjustmentOrder
): InventoryAdjustmentRow[] {
  const invoice = order.invoices[0];
  if (!invoice) {
    return [];
  }

  const invoiceDate = invoice.issuedAt || order.orderedAt;
  const invoiceDateStr = invoiceDate ? formatDateForSAGE(invoiceDate) : '';
  const customerName = order.customer?.name ?? '';
  const invoiceNumber = invoice.invoiceNumber ?? '';

  return order.lines
    .filter((line) => line && line.sku && line.sku.code)
    .map((line) => {
      const quantity = line.quantity ?? 0;
      const unitPrice = Math.abs(normalizeMoney(line.unitPrice));
      const netPrice = unitPrice * Math.abs(quantity);

      return {
        'Invoice date': invoiceDateStr,
        'HAL CUSTOMER': customerName,
        Invoice: invoiceNumber,
        Item: line.sku?.product?.name ?? line.sku?.code ?? '',
        'Qty.': quantity,
        'Unit price': toCurrencyString(unitPrice),
        'Net price': toCurrencyString(netPrice),
        SKU: line.sku?.code ?? '',
        'G/L Account': DEFAULT_GL_ACCOUNT,
      };
    });
}

export function generateInventoryAdjustmentCSV(
  orders: InventoryAdjustmentOrder[]
) {
  const rows = orders.flatMap(orderToInventoryAdjustmentRows);
  const csv = stringify(rows, {
    header: true,
    columns: [
      'Invoice date',
      'HAL CUSTOMER',
      'Invoice',
      'Item',
      'Qty.',
      'Unit price',
      'Net price',
      'SKU',
      'G/L Account',
    ],
  });

  const invoiceSet = new Set<string>();
  for (const order of orders) {
    for (const invoice of order.invoices) {
      if (invoice.invoiceNumber) {
        invoiceSet.add(invoice.invoiceNumber);
      }
    }
  }

  return {
    rows,
    csv,
    invoiceCount: invoiceSet.size,
  };
}
