import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';
import { GET } from './route';

const prisma = new PrismaClient();
const mockAuthContext = {
  tenantId: 'test-tenant-id',
  session: { user: { id: 'test-user-id', email: 'sales@test.com' } },
  db: prisma,
};

type SalesSessionContext = typeof mockAuthContext;
type SalesSessionCallback = (context: SalesSessionContext) => Promise<Response> | Response;

vi.mock('@/lib/auth/sales', () => ({
  withSalesSession: vi.fn((_request: NextRequest, callback: SalesSessionCallback) => callback(mockAuthContext)),
}));

describe('GET /api/sales/analytics/samples', () => {
  let counter = 0;
  let tenantId: string;
  let salesUserId: string;
  let salesRepId: string;
  let customerId: string;
  let supplierId: string;
  let productId: string;
  let skuId: string;

  beforeEach(async () => {
    counter += 1;
    const tenant = await prisma.tenant.create({
      data: {
        slug: `analytics-tenant-${counter}`,
        name: `Analytics Tenant ${counter}`,
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: `rep${counter}@test.com`,
        fullName: 'Sample Analytics Rep',
        hashedPassword: 'hashed-password',
      },
    });
    salesUserId = user.id;

    const salesRep = await prisma.salesRep.create({
      data: {
        tenantId,
        userId: salesUserId,
        territoryName: 'North',
      },
    });
    salesRepId = salesRep.id;

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: `Sample Analytics Customer ${counter}`,
        accountNumber: `SAC-${counter}`,
        salesRepId,
      },
    });
    customerId = customer.id;

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name: `Supplier ${counter}`,
      },
    });
    supplierId = supplier.id;

    const product = await prisma.product.create({
      data: {
        tenantId,
        supplierId,
        name: `Cabernet Reserve ${counter}`,
        brand: 'Downtown Cellars',
      },
    });
    productId = product.id;

    const sku = await prisma.sku.create({
      data: {
        tenantId,
        productId,
        code: `SKU-${counter}`,
        unitOfMeasure: 'bottle',
      },
    });
    skuId = sku.id;

    mockAuthContext.tenantId = tenantId;
    mockAuthContext.session.user.id = salesUserId;
    mockAuthContext.session.user.email = `rep${counter}@test.com`;
  });

  afterEach(async () => {
    await prisma.orderLine.deleteMany({
      where: { tenantId },
    });
    await prisma.order.deleteMany({
      where: { tenantId },
    });
    await prisma.sampleUsage.deleteMany({
      where: { tenantId },
    });
    await prisma.sku.deleteMany({
      where: { tenantId },
    });
    await prisma.product.deleteMany({
      where: { tenantId },
    });
    await prisma.supplier.deleteMany({
      where: { tenantId },
    });
    await prisma.customer.deleteMany({
      where: { tenantId },
    });
    await prisma.salesRep.deleteMany({
      where: { tenantId },
    });
    await prisma.user.deleteMany({
      where: { tenantId },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenantId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedSampleAndOrder() {
    const tastedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const sample = await prisma.sampleUsage.create({
      data: {
        tenantId,
        salesRepId,
        customerId,
        skuId,
        quantity: 1,
        tastedAt,
        feedback: 'Loved the finish and balance.',
        resultedInOrder: false,
      },
    });

    const order = await prisma.order.create({
      data: {
        tenantId,
        customerId,
        status: OrderStatus.FULFILLED,
        orderedAt: new Date(tastedAt.getTime() + 2 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        total: new Prisma.Decimal(120),
      },
    });

    await prisma.orderLine.create({
      data: {
        tenantId,
        orderId: order.id,
        skuId,
        quantity: 3,
        unitPrice: new Prisma.Decimal(40),
      },
    });

    return { sample, order };
  }

  it('returns empty analytics when no samples exist', async () => {
    const request = new NextRequest('http://localhost/api/sales/analytics/samples');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview.totalSamples).toBe(0);
    expect(data.topProducts).toEqual([]);
    expect(data.repPerformance).toEqual([]);
    expect(data.trends).toEqual([]);
  });

  it('calculates conversion and revenue metrics for sample usage', async () => {
    await seedSampleAndOrder();

    const request = new NextRequest('http://localhost/api/sales/analytics/samples');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview.totalSamples).toBe(1);
    expect(data.overview.conversionRate).toBeCloseTo(1);
    expect(data.overview.totalRevenue).toBeCloseTo(120);
    expect(data.overview.activeProducts).toBe(1);

    expect(data.trends).toHaveLength(1);
    expect(data.trends[0].conversions).toBe(1);

    expect(data.topProducts).toHaveLength(1);
    expect(data.topProducts[0].productName).toContain('Cabernet Reserve');
    expect(data.topProducts[0].revenue).toBeCloseTo(120);

    expect(data.repPerformance).toHaveLength(1);
    expect(data.repPerformance[0].name).toBe('Sample Analytics Rep');
    expect(data.repPerformance[0].revenue).toBeCloseTo(120);
  });
});
