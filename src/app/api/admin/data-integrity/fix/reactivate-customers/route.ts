import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/admin/data-integrity/fix/reactivate-customers
 * Bulk reactivate closed customers
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ tenantId, user }) => {
    try {
      const body = await request.json();
      const { customerIds } = body;

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'customerIds array is required' },
          { status: 400 }
        );
      }

      // Update customers
      const result = await prisma.customer.updateMany({
        where: {
          tenantId,
          id: { in: customerIds },
          isPermanentlyClosed: true,
        },
        data: {
          isPermanentlyClosed: false,
          reactivatedDate: new Date(),
          riskStatus: 'HEALTHY',
        },
      });

      // Log to audit
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          entityType: 'Customer',
          entityId: tenantId,
          action: 'BULK_REACTIVATE',
          changes: {
            customerIds,
            count: result.count,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          reactivatedCount: result.count,
        },
        message: `Reactivated ${result.count} customer(s)`,
      });
    } catch (error) {
      console.error('[Fix API] Error reactivating customers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to reactivate customers' },
        { status: 500 }
      );
    }
  });
}
