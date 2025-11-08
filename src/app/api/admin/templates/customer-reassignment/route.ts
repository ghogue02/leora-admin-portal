import { NextRequest } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV } from '@/lib/csv-helper';

/**
 * GET /api/admin/templates/customer-reassignment
 * Download CSV template for customer reassignment
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async () => {
    const headers = ['customerId', 'accountNumber', 'customerName'];

    // Example rows
    const exampleRows = [
      {
        customerId: 'customer-id-123',
        accountNumber: 'ACCT-001',
        customerName: 'Example Customer 1 (either customerId or accountNumber required)'
      },
      {
        customerId: '',
        accountNumber: 'ACCT-002',
        customerName: 'Example Customer 2 (using account number)'
      },
      {
        customerId: 'customer-id-456',
        accountNumber: '',
        customerName: 'Example Customer 3 (using customer ID)'
      }
    ];

    const csv = arrayToCSV(exampleRows, headers);

    // Add instructions as comments
    const instructions = [
      '# Customer Reassignment CSV Template',
      '# Instructions:',
      '# - Either customerId OR accountNumber is required to identify the customer',
      '# - customerName is optional (for reference only)',
      '# - You will select the target sales rep in the UI',
      '# - Delete the example rows below and add your customer data',
      ''
    ].join('\n');

    const fullContent = instructions + csv;

    return createCSVResponse(
      fullContent,
      'customer-reassignment-template.csv'
    );
  });
}
