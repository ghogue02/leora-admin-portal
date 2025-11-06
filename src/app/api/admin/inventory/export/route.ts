import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV, formatCurrencyForCSV } from '@/lib/csv-helper';
import { Prisma } from '@prisma/client';
import { formatUTCDate } from '@/lib/dates';

/**
 * POST /api/admin/inventory/export
 * Export inventory/products to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json().catch(() => ({}));
      const { filters = {} } = body;

      // Build where clause for SKUs
      const where: Prisma.SkuWhereInput = {
        tenantId,
      };

      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { product: { name: { contains: filters.search, mode: 'insensitive' } } },
          { product: { brand: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      if (filters.category) {
        where.product = {
          category: { contains: filters.category, mode: 'insensitive' },
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Fetch SKUs with inventory and product data
      const skus = await db.sku.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true,
              isSampleOnly: true,
              supplier: {
                select: {
                  name: true,
                },
              },
            },
          },
          inventories: {
            select: {
              location: true,
              onHand: true,
              allocated: true,
            },
          },
          priceListItems: {
            where: {
              priceList: {
                isDefault: true,
              },
            },
            select: {
              price: true,
            },
            take: 1,
          },
        },
        orderBy: {
          code: 'asc',
        },
        take: 10000,
      });

      // Transform to export format
      const exportData = skus.flatMap((sku) => {
        const totalOnHand = sku.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
        const totalAllocated = sku.inventories.reduce((sum, inv) => sum + inv.allocated, 0);
        const available = totalOnHand - totalAllocated;
        const defaultPrice = Number(sku.priceListItems[0]?.price || sku.pricePerUnit || 0);

        // If no inventory records, create one row with zeros
        if (sku.inventories.length === 0) {
          return [{
            'SKU Code': sku.code,
            'Product Name': sku.product.name,
            'Brand': sku.product.brand || '',
            'Category': sku.product.category || '',
            'Size': sku.size || '',
            'Unit of Measure': sku.unitOfMeasure || '',
            'ABV': sku.abv || '',
            'Location': 'No Inventory',
            'On Hand': '0',
            'Allocated': '0',
            'Available': '0',
            'Price': formatCurrencyForCSV(defaultPrice),
            'Supplier': sku.product.supplier?.name || '',
            'Sample Only': sku.product.isSampleOnly ? 'Yes' : 'No',
            'Status': sku.isActive ? 'Active' : 'Inactive',
          }];
        }

        // Create a row for each inventory location
        return sku.inventories.map((inv) => ({
          'SKU Code': sku.code,
          'Product Name': sku.product.name,
          'Brand': sku.product.brand || '',
          'Category': sku.product.category || '',
          'Size': sku.size || '',
          'Unit of Measure': sku.unitOfMeasure || '',
          'ABV': sku.abv || '',
          'Location': inv.location,
          'On Hand': inv.onHand.toString(),
          'Allocated': inv.allocated.toString(),
          'Available': (inv.onHand - inv.allocated).toString(),
          'Price': formatCurrencyForCSV(defaultPrice),
          'Supplier': sku.product.supplier?.name || '',
          'Sample Only': sku.product.isSampleOnly ? 'Yes' : 'No',
          'Status': sku.isActive ? 'Active' : 'Inactive',
        }));
      });

      const headers = [
        'SKU Code',
        'Product Name',
        'Brand',
        'Category',
        'Size',
        'Unit of Measure',
        'ABV',
        'Location',
        'On Hand',
        'Allocated',
        'Available',
        'Price',
        'Supplier',
        'Sample Only',
        'Status',
      ];

      const csvContent = arrayToCSV(exportData, headers);

      // Add metadata header
      const metadata = [
        `# Inventory Export`,
        `# Exported by: ${user.fullName}`,
        `# Exported at: ${new Date().toISOString()}`,
        `# Total SKUs: ${skus.length}`,
        `# Total records: ${exportData.length}`,
        ...(skus.length >= 10000 ? ['# WARNING: Limited to 10,000 SKUs'] : []),
        '',
      ].join('\n');

      return createCSVResponse(
        metadata + csvContent,
        `inventory-export-${formatUTCDate(new Date())}.csv`
      );
    } catch (error) {
      console.error('Error exporting inventory:', error);
      return NextResponse.json(
        { error: 'Failed to export inventory' },
        { status: 500 }
      );
    }
  });
}
