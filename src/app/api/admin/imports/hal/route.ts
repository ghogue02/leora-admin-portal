import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { withAdminSession } from '@/lib/auth/admin';
import { importSalesReports } from '../../../../../../scripts/import-csv-data';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId }) => {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing CSV file upload.' }, { status: 400 });
    }

    const dryRun = formData.get('dryRun') === 'true';
    const autoCreateSkus = formData.get('autoCreateSkus') !== 'false';
    const startDateValue = formData.get('startDate');
    const endDateValue = formData.get('endDate');

    const startDate = startDateValue ? new Date(String(startDateValue)) : undefined;
    const endDate = endDateValue ? new Date(String(endDateValue)) : undefined;

    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date.' }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid end date.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempPath = path.join('/tmp', `hal-upload-${randomUUID()}-${sanitizeFileName(file.name)}`);

    await fs.writeFile(tempPath, buffer);

    try {
      const summary = await importSalesReports({
        files: [tempPath],
        dryRun,
        autoCreateSkus,
        startDate,
        endDate,
        tenantId,
      });

      return NextResponse.json({
        ok: true,
        stats: serializeStats(summary),
      });
    } catch (error) {
      console.error('[HAL Import API] Failed to import', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Import failed. Check logs for details.' },
        { status: 500 },
      );
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  });
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function serializeStats(stats: Awaited<ReturnType<typeof importSalesReports>>) {
  return {
    ...stats,
    missingCustomers: Array.from(stats.missingCustomers.entries()),
    missingSkus: Array.from(stats.missingSkus.entries()),
  };
}
