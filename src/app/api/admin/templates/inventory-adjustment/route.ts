import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV } from '@/lib/csv-helper';

/**
 * GET /api/admin/templates/inventory-adjustment
 * Download CSV template for inventory adjustment
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async () => {
    const headers = ['skuCode', 'location', 'adjustmentType', 'quantity', 'reason'];

    // Example rows
    const exampleRows = [
      {
        skuCode: 'SKU-001',
        location: 'WAREHOUSE-A',
        adjustmentType: 'add',
        quantity: '50',
        reason: 'Received shipment from supplier'
      },
      {
        skuCode: 'SKU-002',
        location: 'WAREHOUSE-B',
        adjustmentType: 'subtract',
        quantity: '10',
        reason: 'Damaged goods removal'
      },
      {
        skuCode: 'SKU-003',
        location: 'WAREHOUSE-A',
        adjustmentType: 'set',
        quantity: '100',
        reason: 'Physical count correction'
      }
    ];

    const csv = arrayToCSV(exampleRows, headers);

    // Add instructions as comments
    const instructions = [
      '# Inventory Adjustment CSV Template',
      '# Instructions:',
      '# - skuCode: SKU code (required)',
      '# - location: Warehouse/location code (required)',
      '# - adjustmentType: Must be "add", "subtract", or "set" (required)',
      '#   - add: Adds quantity to existing inventory',
      '#   - subtract: Removes quantity from existing inventory',
      '#   - set: Sets inventory to exact quantity',
      '# - quantity: Non-negative number (required)',
      '# - reason: Reason for adjustment (required)',
      '# - Delete the example rows below and add your inventory adjustments',
      ''
    ].join('\n');

    const fullContent = instructions + csv;

    return createCSVResponse(
      fullContent,
      'inventory-adjustment-template.csv'
    );
  });
}
