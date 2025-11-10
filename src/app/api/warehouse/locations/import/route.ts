import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseLocation } from '@/lib/warehouse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty CSV file' }, { status: 400 });
    }

    // Parse CSV (skip header)
    const header = lines[0].toLowerCase();
    if (!header.includes('sku') || !header.includes('aisle') || !header.includes('row') || !header.includes('shelf')) {
      return NextResponse.json(
        { error: 'CSV must have columns: SKU, Aisle, Row, Shelf, Bin (optional)' },
        { status: 400 }
      );
    }

    const errors: Array<{ line: number; sku: string; error: string }> = [];
    let importedCount = 0;

    // Get warehouse config for validation
    const config = await prisma.warehouseConfig.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map(p => p.trim());

        if (parts.length < 4) {
          errors.push({ line: i + 1, sku: parts[0] || '', error: 'Insufficient columns' });
          continue;
        }

        const [sku, aisle, row, shelf, bin] = parts;

        try {
          // Validate location format
          const locationResult = parseLocation({ aisle, row, shelf });

          if (!locationResult.success) {
            errors.push({ line: i + 1, sku, error: locationResult.error || 'Invalid location' });
            continue;
          }

          // Validate against warehouse config
          if (config) {
            const { components } = locationResult;
            if (components!.aisle > config.aisleCount ||
                components!.row > config.rowsPerAisle ||
                components!.shelf > config.shelfLevels) {
              errors.push({
                line: i + 1,
                sku,
                error: 'Location exceeds warehouse configuration',
              });
              continue;
            }
          }

          // Find inventory by SKU
          const inventory = await tx.inventory.findFirst({
            where: {
              tenantId: session.user.tenantId,
              sku: { code: sku },
            },
          });

          if (!inventory) {
            errors.push({ line: i + 1, sku, error: 'SKU not found in inventory' });
            continue;
          }

          // Update inventory location
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              aisle,
              row,
              shelf,
              bin: bin || null,
              pickOrder: locationResult.pickOrder,
              location: `${aisle}-${row}-${shelf}${bin ? `-${bin}` : ''}`,
            },
          });

          importedCount++;
        } catch (err: any) {
          errors.push({ line: i + 1, sku, error: err.message || 'Import failed' });
        }
      }
    });

    return NextResponse.json({
      imported: importedCount,
      errors,
      total: lines.length - 1,
    });
  } catch (error) {
    console.error('Error importing locations:', error);
    return NextResponse.json(
      { error: 'Failed to import locations' },
      { status: 500 }
    );
  }
}
