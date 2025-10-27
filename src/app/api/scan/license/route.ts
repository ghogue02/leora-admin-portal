/**
 * POST /api/scan/license
 *
 * Upload and scan a liquor license image using Claude Vision.
 * Returns immediately with scanId for async status polling.
 *
 * Request: multipart/form-data
 *   - image: File (JPEG, PNG, WebP, max 5MB)
 *   - tenantId: string
 *   - userId: string
 *
 * Response: { scanId: string, status: 'processing' }
 *
 * Workflow:
 *   1. Upload image to Supabase Storage
 *   2. Create ImageScan record
 *   3. Enqueue job for Claude Vision extraction
 *   4. Return scanId immediately (non-blocking)
 *   5. Client polls GET /api/scan/{scanId} for results
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { uploadImageToSupabase } from '@/lib/storage';
import { enqueueJob } from '@/lib/job-queue';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const tenantId = formData.get('tenantId') as string;
    const userId = formData.get('userId') as string;

    // Validate required fields
    if (!image) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'tenantId and userId are required' },
        { status: 400 }
      );
    }

    // Validate file is an image
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadImageToSupabase(
      image,
      tenantId,
      'liquor_license'
    );

    // Create ImageScan record
    const scan = await prisma.imageScan.create({
      data: {
        tenantId,
        userId,
        imageUrl,
        scanType: 'liquor_license',
        status: 'processing',
        extractedData: {}
      }
    });

    // Enqueue job for async processing
    await enqueueJob('image_extraction', {
      scanId: scan.id,
      imageUrl,
      scanType: 'liquor_license'
    });

    // Return scanId immediately
    return NextResponse.json({
      scanId: scan.id,
      status: 'processing',
      message: 'License scan initiated. Poll /api/scan/{scanId} for results.'
    });

  } catch (error) {
    console.error('License scan failed:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Scan failed'
      },
      { status: 500 }
    );
  }
}
