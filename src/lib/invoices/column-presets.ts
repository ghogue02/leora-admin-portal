/**
 * Invoice column presets
 *
 * Shared between admin UI and PDF generators to keep available columns consistent.
 */

export type InvoiceColumnId =
  | 'quantity'
  | 'cases'
  | 'totalBottles'
  | 'size'
  | 'code'
  | 'abcCode'
  | 'sku'
  | 'productName'
  | 'productCategory'
  | 'description'
  | 'liters'
  | 'unitPrice'
  | 'bottlePrice'
  | 'lineTotal';

export type InvoiceColumnPreset = {
  id: InvoiceColumnId;
  label: string;
  defaultWidth: number;
  defaultAlign?: 'left' | 'center' | 'right';
  description: string;
  /**
   * Optional restriction to specific invoice format types.
   * When omitted the column is available to all formats.
   */
  formats?: Array<'STANDARD' | 'VA_ABC_INSTATE' | 'VA_ABC_TAX_EXEMPT'>;
};

export const COLUMN_PRESETS: InvoiceColumnPreset[] = [
  {
    id: 'quantity',
    label: 'Quantity',
    defaultWidth: 10,
    description: 'Bottle quantity for the line item',
  },
  {
    id: 'cases',
    label: 'Total Cases',
    defaultWidth: 10,
    description: 'Number of cases (for tax-exempt layouts)',
    formats: ['VA_ABC_TAX_EXEMPT'],
  },
  {
    id: 'totalBottles',
    label: 'Total Bottles',
    defaultWidth: 10,
    description: 'Total bottles in the line (tax-exempt layouts)',
    formats: ['VA_ABC_TAX_EXEMPT'],
  },
  {
    id: 'size',
    label: 'Size',
    defaultWidth: 8,
    description: 'Bottle size (e.g. 750ml)',
  },
  {
    id: 'code',
    label: 'Code',
    defaultWidth: 10,
    description: 'Internal product code',
  },
  {
    id: 'abcCode',
    label: 'ABC Code',
    defaultWidth: 10,
    description: 'Virginia ABC code number',
    formats: ['VA_ABC_INSTATE'],
  },
  {
    id: 'sku',
    label: 'SKU',
    defaultWidth: 10,
    description: 'SKU identifier',
  },
  {
    id: 'productName',
    label: 'Brand & Type',
    defaultWidth: 32,
    description: 'Product brand and type description',
  },
  {
    id: 'productCategory',
    label: 'Category',
    defaultWidth: 14,
    description: 'Product category',
    formats: ['STANDARD'],
  },
  {
    id: 'description',
    label: 'Description',
    defaultWidth: 30,
    description: 'Extended description (optional for standard layout)',
    formats: ['STANDARD'],
  },
  {
    id: 'liters',
    label: 'Liters',
    defaultWidth: 10,
    description: 'Total liters for the line item',
  },
  {
    id: 'unitPrice',
    label: 'Unit Price',
    defaultWidth: 10,
    defaultAlign: 'right',
    description: 'Unit price for each bottle/case',
  },
  {
    id: 'bottlePrice',
    label: 'Bottle Price',
    defaultWidth: 10,
    defaultAlign: 'right',
    description: 'Price per bottle (tax-exempt layouts)',
    formats: ['VA_ABC_TAX_EXEMPT'],
  },
  {
    id: 'lineTotal',
    label: 'Amount',
    defaultWidth: 12,
    defaultAlign: 'right',
    description: 'Line total amount',
  },
];

export function getColumnPreset(id: InvoiceColumnId): InvoiceColumnPreset {
  const preset = COLUMN_PRESETS.find((column) => column.id === id);
  if (!preset) {
    throw new Error(`Unknown invoice column preset: ${id}`);
  }
  return preset;
}
