import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportFormatSchema } from '@/lib/validations/warehouse';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const pickSheetExportInclude = {
  items: {
    include: {
      sku: {
        include: {
          product: true,
        },
      },
      customer: {
        include: {
          contacts: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  },
} as const;

type PickSheetExport = Prisma.PickSheetGetPayload<{
  include: typeof pickSheetExportInclude;
}>;

function formatPrimaryContact(customer?: PickSheetExport["items"][number]["customer"]) {
  if (!customer?.contacts?.length) {
    return { name: '', phone: '' };
  }
  const [primary] = customer.contacts;
  return {
    name: primary.fullName ?? '',
    phone: primary.mobile ?? primary.phone ?? '',
  };
}

type DeliveryPacketRow = {
  productName: string;
  customerName: string;
  contactName: string;
  contactPhone: string;
  quantity: number;
  location: string;
  picked: string;
};

function buildDeliveryPacketRows(pickSheet: PickSheetExport): DeliveryPacketRow[] {
  return pickSheet.items.map((item) => {
    const contact = formatPrimaryContact(item.customer);
    return {
      productName: item.sku?.product?.name || 'Unknown',
      customerName: item.customer?.name || 'Unknown',
      contactName: contact.name,
      contactPhone: contact.phone,
      quantity: item.quantity,
      location: item.location || 'Unassigned',
      picked: item.isPicked ? '☑' : '☐',
    };
  });
}

function generateCSV(pickSheet: PickSheetExport, rows: DeliveryPacketRow[]): string {
  const lines: string[] = [];

  // Header info
  lines.push(`Pick Sheet,${pickSheet.sheetNumber}`);
  lines.push(`Status,${pickSheet.status}`);
  lines.push(`Picker,${pickSheet.pickerName || 'Unassigned'}`);
  lines.push(`Date,${new Date(pickSheet.createdAt).toLocaleDateString()}`);
  lines.push('');

  // Column headers
  lines.push('Item,Customer,Contact,Contact Phone,Quantity,Location,Picked');

  // Items
  for (const row of rows) {
    lines.push(
      `"${row.productName}","${row.customerName}","${row.contactName}","${row.contactPhone}",${row.quantity},"${row.location}",${row.picked}`
    );
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
        ...pickSheetExportInclude,
        items: {
          ...pickSheetExportInclude.items,
          orderBy: {
            pickOrder: 'asc',
          },
        },
      },
    });

    if (!pickSheet) {
      return NextResponse.json({ error: 'Pick sheet not found' }, { status: 404 });
    }

    const deliveryRows = buildDeliveryPacketRows(pickSheet);

    if (format === 'csv') {
      const csv = generateCSV(pickSheet, deliveryRows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${pickSheet.sheetNumber}.csv"`,
        },
      });
    }

    // PDF generation would go here
    // For now, return JSON indicating PDF not yet implemented, alongside precomputed delivery rows
    return NextResponse.json(
      { error: 'PDF export not yet implemented. Use CSV format.', deliveryRows },
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
