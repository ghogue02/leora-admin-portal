import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const supplierReportQuerySchema = z.object({
  supplierId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['json', 'pdf']).default('json'),
});

type DateRangeFilter = {
  gte?: Date;
  lte?: Date;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = supplierReportQuerySchema.parse({
      supplierId: searchParams.get('supplierId'),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      format: searchParams.get('format') || undefined,
    });

    // Get supplier details
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Build date filter
    const dateFilter: DateRangeFilter = {};
    if (params.startDate) {
      dateFilter.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      dateFilter.lte = new Date(params.endDate);
    }

    // Get products from this supplier
    const products = await prisma.product.findMany({
      where: { supplierId: params.supplierId },
      include: {
        skus: {
          include: {
            sampleMetrics: Object.keys(dateFilter).length > 0
              ? {
                  where: {
                    periodStart: dateFilter,
                  },
                }
              : undefined,
          },
        },
      },
    });

    // Aggregate metrics by product/SKU
    const productMetrics = products.map(product => {
      return product.skus.map(sku => {
        const metrics = sku.sampleMetrics || [];

        const samplesGiven = metrics.reduce((sum, m) => sum + m.samplesGiven, 0);
        const conversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
        const revenue = metrics.reduce(
          (sum, m) => sum.add(m.totalRevenue),
          new Decimal(0)
        );

        const conversionRate = samplesGiven > 0
          ? (conversions / samplesGiven) * 100
          : 0;

        return {
          product,
          sku,
          samplesGiven,
          conversions,
          conversionRate,
          revenue,
        };
      });
    }).flat();

    // Calculate totals
    const totals = {
      totalSamples: productMetrics.reduce((sum, p) => sum + p.samplesGiven, 0),
      totalRevenue: productMetrics.reduce(
        (sum, p) => sum.add(p.revenue),
        new Decimal(0)
      ),
      avgConversion: 0,
    };

    if (totals.totalSamples > 0) {
      const totalConversions = productMetrics.reduce((sum, p) => sum + p.conversions, 0);
      totals.avgConversion = (totalConversions / totals.totalSamples) * 100;
    }

    // Generate export URL if PDF requested
    let exportUrl: string | undefined;
    if (params.format === 'pdf') {
      // In a real implementation, this would generate a PDF and return a URL
      // For now, we'll return a placeholder
      exportUrl = `/api/samples/supplier-report/pdf?supplierId=${params.supplierId}&startDate=${params.startDate}&endDate=${params.endDate}`;
    }

    const response = {
      supplier,
      products: productMetrics,
      totals,
      exportUrl,
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: params.startDate,
        end: params.endDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SupplierReport] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
