import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { getIntegrityHistory } from '@/lib/jobs/data-integrity-check';

/**
 * GET /api/admin/data-integrity/history
 * Get historical snapshots for graphing quality score trends
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId }) => {
    try {
      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '30');

      const history = await getIntegrityHistory(tenantId, days);

      return NextResponse.json({
        success: true,
        data: {
          snapshots: history.map(snapshot => ({
            date: snapshot.snapshotDate,
            qualityScore: snapshot.qualityScore,
            totalIssues: snapshot.totalIssues,
            criticalIssues: snapshot.criticalIssues,
            issuesByRule: snapshot.issuesByRule,
          })),
          period: {
            days,
            start: history[0]?.snapshotDate,
            end: history[history.length - 1]?.snapshotDate,
          },
        },
      });
    } catch (error) {
      console.error('[DataIntegrity API] Error fetching history:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch integrity history',
        },
        { status: 500 }
      );
    }
  });
}
