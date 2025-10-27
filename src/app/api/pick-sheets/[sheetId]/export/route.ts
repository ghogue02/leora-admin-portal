import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportFormatSchema } from '@/lib/validations/warehouse';
import { z } from 'zod';

function generateCSV(pickSheet: any): string {
  const lines: string[] = [];

  // Header info
  lines.push(`Pick Sheet,${pickSheet.sheetNumber}`);
  lines.push(`Status,${pickSheet.status}`);
  lines.push(`Picker,${pickSheet.pickerName || 'Unassigned'}`);
  lines.push(`Date,${new Date(pickSheet.createdAt).toLocaleDateString()}`);
  lines.push('');

  // Column headers
  lines.push('Item,Customer,Quantity,Location,Picked');

  // Items
  for (const item of pickSheet.items) {
    const productName = item.sku?.product?.name || 'Unknown';
    const customerName = item.customer?.name || 'Unknown';
    const picked = item.isPicked ? '☑' : '☐';
    lines.push(`"${productName}","${customerName}",${item.quantity},"${item.location || 'Unassigned'}",${picked}`);
  }

  return lines.join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sheetId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { format } = exportFormatSchema.parse(Object.fromEntries(searchParams));

    const pickSheet = await prisma.pickSheet.findUnique({
      where: {
        id: params.sheetId,
        tenantId: session.user.tenantId,
      },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
          orderBy: {
            pickOrder: 'asc',
          },
        },
      },
    });

    if (!pickSheet) {
      return NextResponse.json({ error: 'Pick sheet not found' }, { status: 404 });
    }

    if (format === 'csv') {
      const csv = generateCSV(pickSheet);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${pickSheet.sheetNumber}.csv"`,
        },
      });
    }

    // PDF generation would go here
    // For now, return JSON indicating PDF not yet implemented
    return NextResponse.json(
      { error: 'PDF export not yet implemented. Use CSV format.' },
      { status: 501 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Error exporting pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to export pick sheet' },
      { status: 500 }
    );
  }
}
