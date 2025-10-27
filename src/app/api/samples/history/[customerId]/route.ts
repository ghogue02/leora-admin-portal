import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const customerIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // Validate customer ID
    const customerId = customerIdSchema.parse(params.customerId);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Query sample usage history
    const samples = await prisma.sampleUsage.findMany({
      where: { customerId },
      include: {
        sku: {
          include: { product: true },
        },
        salesRep: true,
      },
      orderBy: {
        dateGiven: 'desc',
      },
    });

    // Calculate statistics
    const stats = {
      total: samples.length,
      conversions: samples.filter(s => s.converted).length,
      conversionRate: 0,
      lastSample: samples.length > 0 ? samples[0].dateGiven : null,
    };

    if (stats.total > 0) {
      stats.conversionRate = (stats.conversions / stats.total) * 100;
    }

    return NextResponse.json({
      samples,
      stats,
    });
  } catch (error) {
    console.error('[SampleHistory] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid customer ID',
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
