import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of month
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of month

    // Get top products by revenue for this month in the rep's territory
    const topProducts = await db.$queryRaw<
      Array<{
        skuId: string;
        skuCode: string;
        productName: string;
        brand: string | null;
        totalRevenue: number;
        totalCases: number;
        uniqueCustomers: bigint;
      }>
    >`
      SELECT
        s.id as "skuId",
        s.code as "skuCode",
        p.name as "productName",
        p.brand,
        COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL as "totalRevenue",
        COALESCE(SUM(ol.quantity), 0)::INT as "totalCases",
        COUNT(DISTINCT o."customerId") as "uniqueCustomers"
      FROM "Sku" s
      INNER JOIN "Product" p ON s."productId" = p.id
      LEFT JOIN "OrderLine" ol ON s.id = ol."skuId"
      LEFT JOIN "Order" o ON ol."orderId" = o.id
      LEFT JOIN "Customer" c ON o."customerId" = c.id
      WHERE s."tenantId" = ${salesRep.tenantId}::uuid
        AND c."salesRepId" = ${salesRep.id}::uuid
        AND o.status = 'FULFILLED'
        AND o."deliveredAt" >= ${monthStart}
        AND o."deliveredAt" <= ${monthEnd}
      GROUP BY s.id, s.code, p.name, p.brand
      HAVING SUM(ol.quantity * ol."unitPrice") > 0
      ORDER BY "totalRevenue" DESC
      LIMIT 10
    `;

    // Calculate total revenue for percentage
    const totalRevenue = topProducts.reduce((sum, p) => sum + Number(p.totalRevenue), 0);

    // Format response
    const products = topProducts.map((p) => ({
      skuId: p.skuId,
      skuCode: p.skuCode,
      productName: p.productName,
      brand: p.brand,
      totalRevenue: Number(p.totalRevenue),
      totalCases: p.totalCases,
      uniqueCustomers: Number(p.uniqueCustomers),
      percentOfTotal: totalRevenue > 0 ? (Number(p.totalRevenue) / totalRevenue) * 100 : 0,
    }));

    return NextResponse.json({
      products,
      totalRevenue,
      periodStart: monthStart.toISOString(),
      periodEnd: monthEnd.toISOString(),
    });
  } catch (error) {
    console.error('Top products error:', error);
    return NextResponse.json(
      { error: 'Failed to load top products' },
      { status: 500 }
    );
    }
  });
}
