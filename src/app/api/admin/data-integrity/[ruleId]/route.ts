import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { getValidationRule } from '@/lib/validation/rules';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/data-integrity/[ruleId]
 * Get detailed results for a specific validation rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  return withAdminSession(request, async ({ tenantId }) => {
    try {
      const { ruleId } = await params;
      const rule = getValidationRule(ruleId);

      if (!rule) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation rule not found',
          },
          { status: 404 }
        );
      }

      // Run the specific validation rule
      const result = await rule.check(prisma, tenantId);

      // Get pagination params
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Paginate affected records
      const paginatedRecords = result.affectedRecords.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: {
          rule: {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            hasFix: !!rule.fix,
          },
          issueCount: result.issueCount,
          affectedRecords: paginatedRecords,
          pagination: {
            page,
            limit,
            total: result.issueCount,
            totalPages: Math.ceil(result.issueCount / limit),
          },
        },
      });
    } catch (error) {
      console.error('[DataIntegrity API] Error fetching rule details:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch validation rule details',
        },
        { status: 500 }
      );
    }
  });
}
