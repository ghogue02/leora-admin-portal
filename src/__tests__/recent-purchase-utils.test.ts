import { describe, it, expect } from 'vitest';
import {
  aggregateRecentOrderLines,
  type RawRecentOrderLine,
  type CustomerPricingSnapshot,
} from '@/lib/sales/recent-purchase-utils';

const basePriceList = {
  priceListId: 'pl-std',
  priceListName: 'Standard',
  price: 42,
  minQuantity: 1,
  maxQuantity: null,
  jurisdictionType: 'GLOBAL',
  jurisdictionValue: null,
  allowManualOverride: false,
} as const;

const sampleCustomer: CustomerPricingSnapshot = {
  state: null,
  territory: null,
  accountNumber: null,
  name: 'Sample Bistro',
};

const buildLine = (overrides: Partial<RawRecentOrderLine>): RawRecentOrderLine => ({
  skuId: 'sku-1',
  skuCode: 'SKU-1',
  productName: 'Cabernet Reserve',
  brand: 'Riverbend',
  size: '750ml',
  quantity: 6,
  unitPrice: 42,
  overridePrice: null,
  priceOverridden: false,
  overrideReason: null,
  orderId: 'order-1',
  orderNumber: 'RB-0001',
  orderedAt: new Date('2024-12-01T12:00:00Z').toISOString(),
  priceLists: [basePriceList],
  ...overrides,
});

describe('aggregateRecentOrderLines', () => {
  it('returns most recent purchase per SKU with metadata', () => {
    const lines: RawRecentOrderLine[] = [
      buildLine({ skuId: 'sku-1', orderedAt: new Date('2024-12-02T12:00:00Z').toISOString() }),
      buildLine({
        skuId: 'sku-1',
        orderedAt: new Date('2024-11-02T12:00:00Z').toISOString(),
        orderId: 'older-order',
      }),
      buildLine({
        skuId: 'sku-2',
        skuCode: 'SKU-2',
        productName: 'Chardonnay',
        orderId: 'order-3',
        orderedAt: new Date('2024-12-03T12:00:00Z').toISOString(),
      }),
    ];

    const suggestions = aggregateRecentOrderLines(lines, sampleCustomer, 10);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].skuId).toBe('sku-2');
    expect(suggestions[1].skuId).toBe('sku-1');
    expect(suggestions[1].timesOrdered).toBe(2);
    expect(suggestions[1].lastOrderId).toBe('order-1');
  });

  it('detects legacy pricing when last unit price differs from standard', () => {
    const lines: RawRecentOrderLine[] = [
      buildLine({
        skuId: 'sku-legacy',
        orderId: 'order-legacy',
        overridePrice: 38,
        priceOverridden: true,
        overrideReason: 'Loyalty discount',
        orderedAt: new Date('2024-11-15T12:00:00Z').toISOString(),
      }),
    ];

    const [suggestion] = aggregateRecentOrderLines(lines, sampleCustomer, 5);
    expect(suggestion.priceMatchesStandard).toBe(false);
    expect(suggestion.lastUnitPrice).toBe(38);
    expect(suggestion.priceOverridden).toBe(true);
    expect(suggestion.standardPrice).toBe(42);
  });
});
