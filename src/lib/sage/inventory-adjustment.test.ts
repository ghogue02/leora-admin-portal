import { describe, expect, it } from 'vitest';
import {
  generateInventoryAdjustmentCSV,
  orderToInventoryAdjustmentRows,
} from './inventory-adjustment';

const sampleOrder = {
  id: 'order-1',
  orderedAt: new Date('2025-10-29T00:00:00Z'),
  customer: { name: 'Mike Allen Samples' },
  invoices: [
    {
      invoiceNumber: '178375',
      issuedAt: new Date('2025-10-29T00:00:00Z'),
    },
  ],
  lines: [
    {
      quantity: 1,
      unitPrice: 0,
      sku: {
        code: 'ARG1023',
        product: { name: 'Pampas Grass Pinot Noir' },
      },
    },
  ],
};

describe('inventory adjustment formatting', () => {
  it('converts orders into inventory adjustment rows', () => {
    const rows = orderToInventoryAdjustmentRows(sampleOrder);

    expect(rows).toHaveLength(1);
    expect(rows[0]['Invoice']).toBe('178375');
    expect(rows[0]['HAL CUSTOMER']).toBe('Mike Allen Samples');
    expect(rows[0].Item).toContain('Pampas Grass Pinot Noir');
  });

  it('generates CSV with headers', () => {
    const { csv, invoiceCount } = generateInventoryAdjustmentCSV([sampleOrder]);

    expect(invoiceCount).toBe(1);
    expect(csv).toContain('Invoice date,HAL CUSTOMER,Invoice');
    expect(csv).toContain('Mike Allen Samples');
  });
});
