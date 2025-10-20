import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/audit-logs/[id]
 * Get a single audit log entry with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { id } = await params;
      const log = await db.auditLog.findFirst({
        where: {
          id,
          tenantId,
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
      });

      if (!log) {
        return NextResponse.json(
          { error: 'Audit log not found' },
          { status: 404 }
        );
      }

      // Extract metadata for easier access
      const metadata = (log.metadata as Record<string, unknown>) || {};
      const ipAddress = metadata.ipAddress || null;
      const reason = metadata.reason || null;

      return NextResponse.json({
        log: {
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
          entityType: log.entityType,
          entityId: log.entityId,
          changes: log.changes,
          metadata: log.metadata,
          ipAddress,
          reason,
        },
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      );
    }
  });
}
