import { describe, expect, it } from 'vitest';
import { buildDeliverySummary } from '@/app/api/sales/reports/delivery/summary';

const sampleInvoices = [
  {
    id: 'inv-1',
    total: '100.50',
    status: 'PAID',
    issuedAt: new Date('2024-01-01'),
    order: {
      deliveryTimeWindow: 'Delivery',
      deliveryDate: new Date('2024-01-03'),
    },
  },
  {
    id: 'inv-2',
    total: '250.00',
    status: 'PENDING',
    issuedAt: new Date('2024-01-02'),
    order: {
      deliveryTimeWindow: 'Will Call',
      deliveryDate: new Date('2024-01-05'),
    },
  },
  {
    id: 'inv-3',
    total: '125.25',
    status: 'PAID',
    issuedAt: new Date('2024-01-04'),
    order: {
      deliveryTimeWindow: 'Delivery',
      deliveryDate: null,
    },
  },
] as const;

describe('Delivery summary builder', () => {
  it('aggregates totals and method breakdowns', () => {
    const summary = buildDeliverySummary(sampleInvoices);

    expect(summary.totalInvoices).toBe(3);
    expect(summary.totalRevenue).toBeCloseTo(475.75, 2);
    expect(summary.averageOrderValue).toBeCloseTo(158.58, 2);

    const deliveryMethod = summary.methodBreakdown.find((item) => item.method === 'Delivery');
    const willCallMethod = summary.methodBreakdown.find((item) => item.method === 'Will Call');

    expect(deliveryMethod?.invoiceCount).toBe(2);
    expect(willCallMethod?.invoiceCount).toBe(1);
    expect(deliveryMethod?.revenue).toBeCloseTo(225.75, 2);
    expect(willCallMethod?.share).toBeCloseTo(33.33, 2);

    const paidStatus = summary.statusBreakdown.find((item) => item.status === 'PAID');
    expect(paidStatus?.count).toBe(2);
  });

  it('computes fulfillment metrics', () => {
    const summary = buildDeliverySummary(sampleInvoices);

    expect(summary.fulfillment.scheduledRate).toBeCloseTo((2 / 3) * 100, 5);
    expect(summary.fulfillment.avgLagDays).toBeCloseTo(2.5, 1);
  });
});
