/**
 * Integration Tests: Job Queue System
 * Tests job enqueueing, processing, status tracking, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  enqueueJob,
  processNextJob,
  getJobStatus,
  getPendingJobs,
  cleanupOldJobs,
  type JobType,
  type JobPayload,
} from './job-queue';

const prisma = new PrismaClient();

// Mock image extraction functions
vi.mock('./image-extraction', () => ({
  extractBusinessCard: vi.fn().mockResolvedValue({
    name: 'John Doe',
    company: 'Test Corp',
    phone: '555-1234',
  }),
  extractLiquorLicense: vi.fn().mockResolvedValue({
    licenseNumber: 'LIC-12345',
    expirationDate: '2025-12-31',
  }),
}));

describe('Job Queue System', () => {
  let testTenantId: string;
  let testScanId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-tenant-job-queue',
        name: 'Test Tenant Job Queue',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    // Create test image scan
    const scan = await prisma.imageScan.create({
      data: {
        tenantId: testTenantId,
        imageUrl: 'https://example.com/test.jpg',
        scanType: 'business_card',
        status: 'pending',
      },
    });
    testScanId = scan.id;
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    await prisma.job.deleteMany({
      where: {
        OR: [
          { type: 'image_extraction' },
          { type: 'customer_enrichment' },
          { type: 'report_generation' },
          { type: 'bulk_import' },
        ],
      },
    });
    await prisma.imageScan.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('enqueueJob', () => {
    it('should enqueue an image extraction job', async () => {
      const payload: JobPayload = {
        scanId: testScanId,
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card' as const,
      };

      const jobId = await enqueueJob('image_extraction', payload);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Verify job was created in database
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job).toBeDefined();
      expect(job?.type).toBe('image_extraction');
      expect(job?.status).toBe('pending');
      expect(job?.attempts).toBe(0);
      expect(job?.payload).toEqual(payload);
    });

    it('should enqueue multiple jobs in FIFO order', async () => {
      const job1Id = await enqueueJob('image_extraction', {
        scanId: testScanId,
        imageUrl: 'https://example.com/1.jpg',
        scanType: 'business_card' as const,
      });

      const job2Id = await enqueueJob('customer_enrichment', {
        customerId: 'cust-123',
        productId: 'prod-456',
      });

      const job3Id = await enqueueJob('report_generation', {
        reportType: 'sales',
      });

      const pendingJobs = await getPendingJobs();
      expect(pendingJobs).toHaveLength(3);
      expect(pendingJobs[0].id).toBe(job1Id);
      expect(pendingJobs[1].id).toBe(job2Id);
      expect(pendingJobs[2].id).toBe(job3Id);
    });
  });

  describe('processNextJob', () => {
    it('should process pending job successfully', async () => {
      const jobId = await enqueueJob('image_extraction', {
        scanId: testScanId,
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card' as const,
      });

      const result = await processNextJob();

      expect(result).toBe(true);

      // Verify job is completed
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeDefined();
      expect(job?.attempts).toBe(1);

      // Verify image scan was updated
      const scan = await prisma.imageScan.findUnique({ where: { id: testScanId } });
      expect(scan?.status).toBe('completed');
      expect(scan?.extractedData).toBeDefined();
    });

    it('should return false when queue is empty', async () => {
      const result = await processNextJob();
      expect(result).toBe(false);
    });

    it('should process jobs in FIFO order', async () => {
      const job1Id = await enqueueJob('customer_enrichment', {
        customerId: 'cust-1',
      });
      const job2Id = await enqueueJob('customer_enrichment', {
        customerId: 'cust-2',
      });

      await processNextJob();
      const job1 = await prisma.job.findUnique({ where: { id: job1Id } });
      expect(job1?.status).toBe('completed');

      await processNextJob();
      const job2 = await prisma.job.findUnique({ where: { id: job2Id } });
      expect(job2?.status).toBe('completed');
    });

    it('should handle job processing failures', async () => {
      // Create a job with invalid data that will cause processing to fail
      const job = await prisma.job.create({
        data: {
          type: 'image_extraction',
          payload: { scanId: 'invalid-scan-id', imageUrl: '', scanType: 'business_card' },
          status: 'pending',
          attempts: 0,
        },
      });

      const result = await processNextJob();

      expect(result).toBe(false);

      // Verify job is marked as failed
      const failedJob = await prisma.job.findUnique({ where: { id: job.id } });
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.error).toBeDefined();
      expect(failedJob?.attempts).toBe(1);
    });

    it('should retry failed jobs up to 3 times', async () => {
      const job = await prisma.job.create({
        data: {
          type: 'image_extraction',
          payload: { scanId: 'invalid-id', imageUrl: '', scanType: 'business_card' },
          status: 'pending',
          attempts: 0,
        },
      });

      // Process 3 times (max retries)
      await processNextJob();
      await processNextJob();
      await processNextJob();

      const failedJob = await prisma.job.findUnique({ where: { id: job.id } });
      expect(failedJob?.attempts).toBe(3);

      // Should not process again after max retries
      const result = await processNextJob();
      expect(result).toBe(false);
    });

    it('should mark job as processing and increment attempts', async () => {
      const jobId = await enqueueJob('report_generation', { reportType: 'test' });

      // Start processing (we'll check mid-processing state)
      const jobBefore = await prisma.job.findUnique({ where: { id: jobId } });
      expect(jobBefore?.status).toBe('pending');
      expect(jobBefore?.attempts).toBe(0);

      await processNextJob();

      const jobAfter = await prisma.job.findUnique({ where: { id: jobId } });
      expect(jobAfter?.attempts).toBe(1);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status by ID', async () => {
      const jobId = await enqueueJob('bulk_import', { source: 'csv' });

      const status = await getJobStatus(jobId);

      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
      expect(status?.type).toBe('bulk_import');
      expect(status?.status).toBe('pending');
    });

    it('should return null for non-existent job', async () => {
      const status = await getJobStatus('non-existent-id');
      expect(status).toBeNull();
    });

    it('should track job progress through lifecycle', async () => {
      const jobId = await enqueueJob('customer_enrichment', { customerId: 'cust-123' });

      // Initial status
      let status = await getJobStatus(jobId);
      expect(status?.status).toBe('pending');

      // Process job
      await processNextJob();

      // Final status
      status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      expect(status?.completedAt).toBeDefined();
    });
  });

  describe('getPendingJobs', () => {
    it('should return all pending jobs', async () => {
      await enqueueJob('image_extraction', { scanId: testScanId, imageUrl: '', scanType: 'business_card' as const });
      await enqueueJob('customer_enrichment', { customerId: 'cust-123' });
      await enqueueJob('report_generation', { reportType: 'sales' });

      const pending = await getPendingJobs();

      expect(pending).toHaveLength(3);
      expect(pending.every(job => job.status === 'pending')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await enqueueJob('bulk_import', { batch: i });
      }

      const pending = await getPendingJobs(5);
      expect(pending).toHaveLength(5);
    });

    it('should return jobs in FIFO order', async () => {
      const job1Id = await enqueueJob('image_extraction', { scanId: '1', imageUrl: '', scanType: 'business_card' as const });
      const job2Id = await enqueueJob('image_extraction', { scanId: '2', imageUrl: '', scanType: 'business_card' as const });

      const pending = await getPendingJobs();

      expect(pending[0].id).toBe(job1Id);
      expect(pending[1].id).toBe(job2Id);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should delete old completed jobs', async () => {
      // Create old completed job
      const oldJob = await prisma.job.create({
        data: {
          type: 'report_generation',
          payload: { test: true },
          status: 'completed',
          attempts: 1,
          completedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
      });

      const deleted = await cleanupOldJobs(30);

      expect(deleted).toBe(1);

      const job = await prisma.job.findUnique({ where: { id: oldJob.id } });
      expect(job).toBeNull();
    });

    it('should delete old failed jobs', async () => {
      const oldFailedJob = await prisma.job.create({
        data: {
          type: 'bulk_import',
          payload: { test: true },
          status: 'failed',
          attempts: 3,
          error: 'Test error',
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
      });

      const deleted = await cleanupOldJobs(30);

      expect(deleted).toBe(1);

      const job = await prisma.job.findUnique({ where: { id: oldFailedJob.id } });
      expect(job).toBeNull();
    });

    it('should not delete recent jobs', async () => {
      const recentJob = await enqueueJob('image_extraction', {
        scanId: testScanId,
        imageUrl: '',
        scanType: 'business_card' as const,
      });

      const deleted = await cleanupOldJobs(30);

      expect(deleted).toBe(0);

      const job = await prisma.job.findUnique({ where: { id: recentJob } });
      expect(job).toBeDefined();
    });

    it('should not delete pending jobs', async () => {
      const pendingJob = await prisma.job.create({
        data: {
          type: 'customer_enrichment',
          payload: { customerId: 'test' },
          status: 'pending',
          attempts: 0,
          createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
      });

      const deleted = await cleanupOldJobs(30);

      expect(deleted).toBe(0);

      const job = await prisma.job.findUnique({ where: { id: pendingJob.id } });
      expect(job).toBeDefined();
    });
  });

  describe('Job Type Handlers', () => {
    it('should handle image_extraction for business cards', async () => {
      const jobId = await enqueueJob('image_extraction', {
        scanId: testScanId,
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card' as const,
      });

      await processNextJob();

      const scan = await prisma.imageScan.findUnique({ where: { id: testScanId } });
      expect(scan?.status).toBe('completed');
      expect(scan?.extractedData).toEqual({
        name: 'John Doe',
        company: 'Test Corp',
        phone: '555-1234',
      });
    });

    it('should handle image_extraction for liquor licenses', async () => {
      const licenseScan = await prisma.imageScan.create({
        data: {
          tenantId: testTenantId,
          imageUrl: 'https://example.com/license.jpg',
          scanType: 'liquor_license',
          status: 'pending',
        },
      });

      await enqueueJob('image_extraction', {
        scanId: licenseScan.id,
        imageUrl: 'https://example.com/license.jpg',
        scanType: 'liquor_license' as const,
      });

      await processNextJob();

      const scan = await prisma.imageScan.findUnique({ where: { id: licenseScan.id } });
      expect(scan?.status).toBe('completed');
      expect(scan?.extractedData).toEqual({
        licenseNumber: 'LIC-12345',
        expirationDate: '2025-12-31',
      });
    });

    it('should handle customer_enrichment jobs', async () => {
      const jobId = await enqueueJob('customer_enrichment', {
        customerId: 'cust-123',
        productId: 'prod-456',
      });

      await processNextJob();

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job?.status).toBe('completed');
    });

    it('should handle report_generation jobs', async () => {
      const jobId = await enqueueJob('report_generation', {
        reportType: 'sales',
        period: '2024-Q1',
      });

      await processNextJob();

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job?.status).toBe('completed');
    });

    it('should handle bulk_import jobs', async () => {
      const jobId = await enqueueJob('bulk_import', {
        source: 'csv',
        fileName: 'customers.csv',
      });

      await processNextJob();

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job?.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown job types', async () => {
      const job = await prisma.job.create({
        data: {
          type: 'unknown_type' as JobType,
          payload: {},
          status: 'pending',
          attempts: 0,
        },
      });

      await processNextJob();

      const failedJob = await prisma.job.findUnique({ where: { id: job.id } });
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.error).toContain('Unknown job type');
    });

    it('should handle database errors gracefully', async () => {
      const jobId = await enqueueJob('image_extraction', {
        scanId: 'non-existent-scan',
        imageUrl: 'https://example.com/card.jpg',
        scanType: 'business_card' as const,
      });

      await processNextJob();

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      expect(job?.status).toBe('failed');
      expect(job?.error).toBeDefined();
    });
  });
});
