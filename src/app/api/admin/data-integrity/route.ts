import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { runDataIntegrityCheck, getLatestSnapshot } from '@/lib/jobs/data-integrity-check';
import { allValidationRules } from '@/lib/validation/rules';

/**
 * GET /api/admin/data-integrity
 * Get current data integrity status and alerts
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId }) => {
    try {
      // Check if we have a recent snapshot (within 5 minutes)
      const latestSnapshot = await getLatestSnapshot(tenantId);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      let result;

      if (latestSnapshot && new Date(latestSnapshot.snapshotDate) > fiveMinutesAgo) {
        // Use cached snapshot
        result = {
          tenantId,
          totalIssues: latestSnapshot.totalIssues,
          criticalIssues: latestSnapshot.criticalIssues,
          qualityScore: latestSnapshot.qualityScore,
          issuesByRule: latestSnapshot.issuesByRule as Record<string, number>,
          timestamp: latestSnapshot.snapshotDate,
          cached: true,
        };
      } else {
        // Run fresh check
        result = await runDataIntegrityCheck(tenantId);
        (result as any).cached = false;
      }

      // Build alerts array with metadata
      const alerts = allValidationRules.map(rule => ({
        ruleId: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        count: result.issuesByRule[rule.id] || 0,
        hasFix: !!rule.fix,
      }));

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalIssues: result.totalIssues,
            criticalIssues: result.criticalIssues,
            qualityScore: result.qualityScore,
            lastChecked: result.timestamp,
            cached: (result as any).cached,
          },
          alerts,
        },
      });
    } catch (error) {
      console.error('[DataIntegrity API] Error:', error);

      // Check if this is a "table doesn't exist" error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        return NextResponse.json(
          {
            success: false,
            error: 'DataIntegritySnapshot table not found',
            setupRequired: true,
            message: 'The DataIntegritySnapshot table has not been created yet. Please run database migrations.',
            instructions: [
              'Run: npx prisma migrate dev',
              'Or run: npx prisma db push',
            ],
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch data integrity status',
        },
        { status: 500 }
      );
    }
  });
}
