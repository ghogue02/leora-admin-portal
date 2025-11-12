/**
 * SAGE Export API
 *
 * @route POST /api/sage/export
 * @description Kicks off an export for the provided date range and returns metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'date-fns';
import { withAdminSession } from '@/lib/auth/admin';
import { exportToSage } from '@/lib/sage/export-runner';

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId, user }) => {
    try {
      const body = await request.json();
      const { startDate, endDate } = body ?? {};

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Missing required parameters: startDate and endDate' },
          { status: 400 }
        );
      }

      const start = parse(startDate, 'yyyy-MM-dd', new Date());
      start.setUTCHours(0, 0, 0, 0);

      const end = parse(endDate, 'yyyy-MM-dd', new Date());
      end.setUTCHours(23, 59, 59, 999);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      if (start > end) {
        return NextResponse.json(
          { error: 'startDate must be before endDate.' },
          { status: 400 }
        );
      }

      const result = await exportToSage(tenantId, start, end, user.id);

      return NextResponse.json({
        exportId: result.exportId,
        fileName: result.fileName,
        sampleFileName: result.sampleFileName,
        recordCount: result.recordCount,
        invoiceCount: result.invoiceCount,
        sampleRecordCount: result.sampleRecordCount,
        sampleInvoiceCount: result.sampleInvoiceCount,
        storageInvoiceCount: result.storageInvoiceCount,
        hasSampleFile: Boolean(result.sampleFileName && result.sampleRecordCount > 0),
      });
    } catch (error) {
      console.error('[SAGE Export API] Failed to export', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to export SAGE data' },
        { status: 500 }
      );
    }
  });
}
