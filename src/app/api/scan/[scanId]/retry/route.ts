/**
 * POST /api/scan/{scanId}/retry
 *
 * Retry a failed image scan.
 * Re-enqueues the job for processing with Claude Vision.
 *
 * Request: (empty body)
 *
 * Response:
 * {
 *   scanId: string,
 *   status: 'processing',
 *   message: 'Scan retry initiated'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { enqueueJob } from '@/lib/job-queue';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    scanId: string;
  };
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { scanId } = params;

    // Get scan record
    const scan = await prisma.imageScan.findUnique({
      where: { id: scanId }
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Only retry failed scans
    if (scan.status !== 'failed') {
      return NextResponse.json(
        { error: 'Can only retry failed scans' },
        { status: 400 }
      );
    }

    // Reset scan status
    await prisma.imageScan.update({
      where: { id: scanId },
      data: {
        status: 'processing',
        errorMessage: null,
        completedAt: null
      }
    });

    // Re-enqueue job
    await enqueueJob('image_extraction', {
      scanId: scan.id,
      imageUrl: scan.imageUrl,
      scanType: scan.scanType
    });

    return NextResponse.json({
      scanId: scan.id,
      status: 'processing',
      message: 'Scan retry initiated. Poll /api/scan/{scanId} for results.'
    });

  } catch (error) {
    console.error('Retry scan failed:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Retry failed'
      },
      { status: 500 }
    );
  }
}
