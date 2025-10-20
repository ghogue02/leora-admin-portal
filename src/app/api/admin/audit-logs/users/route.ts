import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/audit-logs/users
 * Get distinct users who have made audit log entries
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      // Get distinct user IDs from audit logs
      const distinctUserIds = await db.auditLog.findMany({
        where: {
          tenantId,
          userId: { not: null },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      const userIds = distinctUserIds
        .map((item) => item.userId)
        .filter(Boolean) as string[];

      // Get user details
      const users = await db.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      });

      return NextResponse.json({
        users: users.map((user) => ({
          id: user.id,
          name: user.fullName,
          email: user.email,
        })),
      });
    } catch (error) {
      console.error('Error fetching audit log users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit log users' },
        { status: 500 }
      );
    }
  });
}
