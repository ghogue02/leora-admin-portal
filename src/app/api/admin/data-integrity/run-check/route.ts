import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { runAndSaveIntegrityCheck } from '@/lib/jobs/data-integrity-check';

/**
 * POST /api/admin/data-integrity/run-check
 * Manually trigger a fresh integrity check
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId, user }) => {
    try {
      console.log(`[DataIntegrity] Manual check triggered by user ${user.id}`);

      // Run fresh check and save snapshot
      const result = await runAndSaveIntegrityCheck(tenantId);

      return NextResponse.json({
        success: true,
        data: {
          totalIssues: result.totalIssues,
          criticalIssues: result.criticalIssues,
          qualityScore: result.qualityScore,
          issuesByRule: result.issuesByRule,
          timestamp: result.timestamp,
        },
        message: 'Data integrity check completed successfully',
      });
    } catch (error) {
      console.error('[DataIntegrity API] Error running check:', error);

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
          error: 'Failed to run data integrity check',
        },
        { status: 500 }
      );
    }
  });
}
