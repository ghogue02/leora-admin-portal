/**
 * SAGE Export History API
 *
 * Returns the most recent SAGE export runs for display in the admin UI.
 *
 * @route GET /api/sage/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { formatUTCDate } from '@/lib/dates';

const DEFAULT_HISTORY_LIMIT = 25;
const MAX_HISTORY_LIMIT = 100;

export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;

    try {
      const { searchParams } = new URL(request.url);
      const limitParam = searchParams.get('limit');

      let limit = DEFAULT_HISTORY_LIMIT;
      if (limitParam) {
        const parsed = Number.parseInt(limitParam, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, MAX_HISTORY_LIMIT);
        }
      }

      const exports = await db.sageExport.findMany({
        where: { tenantId },
        orderBy: { exportedAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      });

      const payload = exports.map((record) => ({
        id: record.id,
        startDate: formatUTCDate(record.startDate),
        endDate: formatUTCDate(record.endDate),
        recordCount: record.recordCount,
        invoiceCount: record.invoiceCount,
        status: record.status,
        fileName:
          record.fileName ??
          `SAGE_Export_${formatUTCDate(record.startDate)}.csv`,
        sampleFileName: record.sampleFileName,
        sampleRecordCount: record.sampleRecordCount,
        sampleInvoiceCount: record.sampleInvoiceCount,
        storageInvoiceCount: record.storageInvoiceCount,
        hasSampleFile: Boolean(
          record.sampleFileName && record.sampleRecordCount > 0
        ),
        createdAt: record.exportedAt.toISOString(),
        completedAt: record.completedAt ? record.completedAt.toISOString() : null,
        errorMessage: record.errorMessage ?? null,
        exportedBy: (() => {
          const fullName = record.user?.fullName?.trim();
          if (!fullName) {
            return null;
          }
          const [firstName, ...rest] = fullName.split(/\s+/);
          return {
            firstName,
            lastName: rest.join(' '),
          };
        })(),
      }));

      return NextResponse.json({ exports: payload });
    } catch (error) {
      console.error('[SAGE History API] Failed to load export history', error);
      return NextResponse.json(
        { error: 'Failed to load export history' },
        { status: 500 }
      );
    }
  });
}
