/**
 * Job Queue Infrastructure for Async Processing
 *
 * Simple database-backed job queue for serverless environments.
 * Handles async tasks like image extraction, AI processing, etc.
 *
 * Usage:
 *   1. Enqueue job: await enqueueJob('image_extraction', payload)
 *   2. Process jobs: Call /api/jobs/process endpoint (triggered by cron or webhook)
 *   3. Poll status: Check Job.status field in database
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { extractBusinessCard, extractLiquorLicense } from './image-extraction';
import { downloadImportFile } from './imports/upload';
import { ingestSalesReportRecords, parseSalesReportCsv } from './imports/sales-report-ingestion';

const prisma = new PrismaClient();

/**
 * Job Types supported by the queue
 */
export type JobType =
  | 'image_extraction'
  | 'customer_enrichment'
  | 'report_generation'
  | 'bulk_import';

/**
 * Job Status States
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Job Payload Types
 */
export interface ImageExtractionPayload {
  scanId: string;
  imageUrl: string;
  scanType: 'business_card' | 'liquor_license';
}

export interface CustomerEnrichmentPayload {
  customerId: string;
  productId?: string;
}

export type JobPayload =
  | ImageExtractionPayload
  | CustomerEnrichmentPayload
  | Record<string, any>;

/**
 * Enqueue a new job for async processing
 *
 * @param type - Type of job to process
 * @param payload - Job-specific data
 * @returns Job ID for tracking
 *
 * @example
 * const jobId = await enqueueJob('image_extraction', {
 *   scanId: scan.id,
 *   imageUrl: uploadedUrl,
 *   scanType: 'business_card'
 * });
 */
export async function enqueueJob(
  type: JobType,
  payload: JobPayload
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      payload,
      status: 'pending',
      attempts: 0
    }
  });

  return job.id;
}

/**
 * Process the next pending job in the queue
 *
 * Uses FIFO order and automatic retry logic (max 3 attempts).
 * Safe to call repeatedly - returns false when queue is empty.
 *
 * @returns true if job was processed, false if queue is empty
 *
 * @example
 * // Process all pending jobs
 * while (await processNextJob()) {
 *   console.log('Processed job');
 * }
 */
export async function processNextJob(): Promise<boolean> {
  // Find oldest pending job with attempts remaining
  const job = await prisma.job.findFirst({
    where: {
      status: 'pending',
      attempts: { lt: 3 } // Max 3 retries
    },
    orderBy: { createdAt: 'asc' }
  });

  if (!job) {
    return false; // Queue is empty
  }

  // Mark as processing and increment attempts
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      attempts: { increment: 1 }
    }
  });

  try {
    // Route to appropriate handler based on job type
    await routeJobToHandler(job.type as JobType, job.payload as JobPayload);

    // Mark as completed
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    return true;

  } catch (error) {
    // Log error and mark as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        error: errorMessage
      }
    });

    console.error(`Job ${job.id} failed:`, errorMessage);
    return false;
  }
}

/**
 * Route job to appropriate handler function
 */
async function routeJobToHandler(type: JobType, payload: JobPayload): Promise<void> {
  switch (type) {
    case 'image_extraction':
      await processImageExtraction(payload as ImageExtractionPayload);
      break;

    case 'customer_enrichment':
      await processCustomerEnrichment(payload as CustomerEnrichmentPayload);
      break;

    case 'report_generation':
      await processReportGeneration(payload);
      break;

    case 'bulk_import':
      await processBulkImport(payload);
      break;

    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

/**
 * Handler: Image Extraction (Business Cards & Licenses)
 *
 * Uses Claude Vision API to extract structured data from images
 */
async function processImageExtraction(payload: ImageExtractionPayload): Promise<void> {
  const { scanId, imageUrl, scanType } = payload;

  // Extract data using Claude Vision
  const extractedData = scanType === 'business_card'
    ? await extractBusinessCard(imageUrl)
    : await extractLiquorLicense(imageUrl);

  // Update scan record with extracted data
  await prisma.imageScan.update({
    where: { id: scanId },
    data: {
      extractedData,
      status: 'completed'
    }
  });
}

/**
 * Handler: Customer Enrichment (AI-powered product insights)
 *
 * Enriches product data with AI-generated descriptions, pairings, etc.
 */
async function processCustomerEnrichment(payload: CustomerEnrichmentPayload): Promise<void> {
  const { customerId, productId } = payload;

  // TODO: Implement customer/product enrichment logic
  // This would call Claude API to generate product descriptions,
  // tasting notes, food pairings, etc.

  console.log(`Processing enrichment for customer ${customerId}, product ${productId}`);
}

/**
 * Handler: Report Generation
 *
 * Generates complex reports that may take time to compute
 */
async function processReportGeneration(payload: Record<string, any>): Promise<void> {
  // TODO: Implement report generation logic
  console.log('Processing report generation:', payload);
}

/**
 * Handler: Bulk Import
 *
 * Processes bulk data imports (CSV, Excel, etc.)
 */
async function processBulkImport(payload: Record<string, any>): Promise<void> {
  const batchId = typeof payload?.batchId === 'string' ? payload.batchId : null;
  if (!batchId) {
    console.warn('[job-queue] bulk_import job missing batchId; skipping.');
    return;
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error(`Import batch ${batchId} not found.`);
  }

  if (!batch.fileKey) {
    throw new Error(`Import batch ${batchId} is missing a file reference.`);
  }

  const startedAt = new Date();
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: 'processing',
      startedAt,
    },
  });

  try {
    const { buffer } = await downloadImportFile(batch.fileKey);
    const csvText = buffer.toString('utf-8');

    const normalizedDataType = (batch.dataType ?? '').toLowerCase();
    let ingestionResult = null;

    switch (normalizedDataType) {
      case 'sales_report':
      case 'salesreport':
      case 'orders':
      case 'order_lines':
      case 'orderlines': {
        const records = parseSalesReportCsv(csvText);
        ingestionResult = await ingestSalesReportRecords(prisma, batch.tenantId, records);
        break;
      }
      default:
        throw new Error(`Unsupported bulk import data type: ${batch.dataType}`);
    }

    const summary: Prisma.JsonObject = {
      ...toJsonObject(batch.summary),
      lastRunAt: new Date().toISOString(),
      lastResult: ingestionResult,
    };

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        summary,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown bulk import error';
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        summary: {
          ...toJsonObject(batch.summary),
          lastError: message,
          lastErrorAt: new Date().toISOString(),
        },
      },
    });
    throw error;
  }
}

/**
 * Get job status by ID
 *
 * @param jobId - Job ID to check
 * @returns Job record or null if not found
 */
export async function getJobStatus(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId }
  });
}

/**
 * Get all pending jobs (useful for monitoring)
 *
 * @param limit - Max number of jobs to return
 * @returns Array of pending jobs
 */
export async function getPendingJobs(limit: number = 50) {
  return prisma.job.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit
  });
}

function toJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Prisma.JsonObject;
  }
  return {};
}

/**
 * Clean up old completed/failed jobs
 *
 * Recommended to run periodically to prevent database bloat
 *
 * @param daysOld - Delete jobs older than this many days
 * @returns Number of jobs deleted
 */
export async function cleanupOldJobs(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.job.deleteMany({
    where: {
      OR: [
        { status: 'completed' },
        { status: 'failed' }
      ],
      createdAt: { lt: cutoffDate }
    }
  });

  return result.count;
}
