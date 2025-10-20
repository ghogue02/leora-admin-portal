import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/audit-logs/entity-types
 * Get distinct entity types from audit logs
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      // Get distinct entity types
      const distinctEntityTypes = await db.auditLog.findMany({
        where: {
          tenantId,
        },
        select: {
          entityType: true,
        },
        distinct: ['entityType'],
        orderBy: {
          entityType: 'asc',
        },
      });

      const entityTypes = distinctEntityTypes.map((item) => item.entityType);

      return NextResponse.json({
        entityTypes,
      });
    } catch (error) {
      console.error('Error fetching entity types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch entity types' },
        { status: 500 }
      );
    }
  });
}
