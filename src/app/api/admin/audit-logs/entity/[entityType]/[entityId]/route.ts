import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/audit-logs/entity/[entityType]/[entityId]
 * Get all logs for a specific entity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { entityType, entityId } = await params;
      const logs = await db.auditLog.findMany({
        where: {
          tenantId,
          entityType,
          entityId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Chronological order
        },
      });

      // Transform logs
      const transformedLogs = logs.map((log) => {
        const metadata = (log.metadata as Record<string, unknown>) || {};
        return {
          id: log.id,
          createdAt: log.createdAt,
          user: log.user
            ? {
                id: log.user.id,
                name: log.user.fullName,
                email: log.user.email,
              }
            : null,
          action: log.action,
          changes: log.changes,
          metadata: log.metadata,
          ipAddress: metadata.ipAddress || null,
          reason: metadata.reason || null,
        };
      });

      return NextResponse.json({
        logs: transformedLogs,
        entityType,
        entityId,
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch entity audit logs' },
        { status: 500 }
      );
    }
  });
}
