import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { getValidationRule } from '@/lib/validation/rules';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/admin/data-integrity/[ruleId]/fix
 * Execute auto-fix for a validation rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  return withAdminSession(request, async ({ tenantId, user }) => {
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

      if (!rule.fix) {
        return NextResponse.json(
          {
            success: false,
            error: 'This rule does not have an auto-fix implementation',
          },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { recordIds, params: fixParams } = body;

      if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'recordIds array is required',
          },
          { status: 400 }
        );
      }

      // Execute fix in a transaction
      await prisma.$transaction(async (tx) => {
        await rule.fix!(tx, tenantId, recordIds, fixParams);
      });

      // Log to audit log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          entityType: 'DataIntegrity',
          entityId: ruleId,
          action: 'FIX',
          changes: {
            ruleId,
            ruleName: rule.name,
            recordCount: recordIds.length,
            recordIds,
            params: fixParams,
          },
          metadata: {
            source: 'data-integrity-dashboard',
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          successCount: recordIds.length,
          ruleId,
          ruleName: rule.name,
        },
        message: `Successfully fixed ${recordIds.length} record(s)`,
      });
    } catch (error) {
      console.error('[DataIntegrity API] Error executing fix:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute fix',
        },
        { status: 500 }
      );
    }
  });
}
