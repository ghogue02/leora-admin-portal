/**
 * Cron Job: Process Email Queue
 * Processes pending emails from the EmailMessage table
 * Runs every 5 minutes via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPendingEmails } from '@/lib/email/resend-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('[Email Queue] Starting processing...');

    // Process pending emails
    const result = await processPendingEmails();

    console.log('[Email Queue] Processing complete:', {
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    });

    // Return detailed results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('[Email Queue] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
