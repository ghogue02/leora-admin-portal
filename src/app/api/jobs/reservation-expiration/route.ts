import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/jobs/reservation-expiration";

/**
 * GET /api/jobs/reservation-expiration
 *
 * Trigger reservation expiration job
 *
 * This endpoint can be called by:
 * - Cron service (Vercel Cron, GitHub Actions, etc.)
 * - Manual trigger for testing
 *
 * Setup Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/jobs/reservation-expiration",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

export async function GET() {
  // TODO: Add authentication - only allow from cron service or admin
  // For now, anyone can trigger (useful for testing)

  try {
    const result = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Reservation expiration job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Job failed',
      },
      { status: 500 }
    );
  }
}
