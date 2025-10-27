/**
 * Job Processing API Route
 *
 * POST /api/jobs/process
 *
 * Processes pending jobs from the queue. This endpoint should be called:
 * 1. By a cron job (e.g., Vercel Cron, GitHub Actions)
 * 2. By webhooks after job enqueue
 * 3. Manually for testing
 *
 * Security: Protected by API key to prevent unauthorized processing
 */

import { NextResponse } from 'next/server';
import { processNextJob, getPendingJobs } from '@/lib/job-queue';

/**
 * Process jobs from the queue
 *
 * Query params:
 *   - maxJobs: Maximum number of jobs to process (default: 10)
 *   - apiKey: Authentication key (required)
 *
 * @example
 * POST /api/jobs/process?maxJobs=5
 * Headers: { "x-api-key": "your-secret-key" }
 */
export async function POST(request: Request) {
  // 1. Verify API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.JOB_PROCESSOR_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const maxJobs = parseInt(searchParams.get('maxJobs') || '10', 10);

  // 3. Process jobs
  const results = {
    processed: 0,
    failed: 0,
    startTime: new Date().toISOString()
  };

  for (let i = 0; i < maxJobs; i++) {
    const success = await processNextJob();

    if (!success) {
      break; // Queue is empty
    }

    if (success) {
      results.processed++;
    } else {
      results.failed++;
    }
  }

  // 4. Return summary
  return NextResponse.json({
    ...results,
    endTime: new Date().toISOString(),
    message: `Processed ${results.processed} jobs, ${results.failed} failed`
  });
}

/**
 * Get queue status (for monitoring)
 *
 * GET /api/jobs/process
 *
 * Returns current queue statistics
 */
export async function GET(request: Request) {
  // Verify API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.JOB_PROCESSOR_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get pending jobs
  const pendingJobs = await getPendingJobs(100);

  return NextResponse.json({
    pendingCount: pendingJobs.length,
    jobs: pendingJobs.map(job => ({
      id: job.id,
      type: job.type,
      attempts: job.attempts,
      createdAt: job.createdAt
    }))
  });
}
