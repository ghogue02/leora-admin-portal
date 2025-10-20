import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total logs count
      const totalLogsCount = await db.auditLog.count({
        where: { tenantId },
      });

      // Today's activity count
      const todayActivityCount = await db.auditLog.count({
        where: {
          tenantId,
          createdAt: {
            gte: todayStart,
          },
        },
      });

      // Activity by day (last 30 days)
      const activityByDay = await db.$queryRaw<
        Array<{ date: Date; count: bigint }>
      >(
        Prisma.sql`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "AuditLog"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${thirtyDaysAgo}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      );

      // Actions breakdown
      const actionsBreakdown = await db.auditLog.groupBy({
        by: ['action'],
        where: { tenantId },
        _count: {
          action: true,
        },
      });

      // Entity types breakdown
      const entityTypesBreakdown = await db.auditLog.groupBy({
        by: ['entityType'],
        where: { tenantId },
        _count: {
          entityType: true,
        },
      });

      // Top 10 active users
      const topActiveUsers = await db.auditLog.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          userId: { not: null },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      });

      // Get user details for top active users
      const userIds = topActiveUsers.map((u) => u.userId).filter(Boolean) as string[];
      const users = await db.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

      const topUsersWithNames = topActiveUsers.map((u) => {
        const user = users.find((usr) => usr.id === u.userId);
        return {
          userId: u.userId,
          name: user?.fullName || 'Unknown',
          email: user?.email || '',
          count: u._count.userId,
        };
      });

      // Most active user
      const mostActiveUser = topUsersWithNames.length > 0 ? topUsersWithNames[0] : null;

      // Most modified entity type
      const mostModifiedEntityType =
        entityTypesBreakdown.length > 0
          ? entityTypesBreakdown.reduce((prev, current) =>
              prev._count.entityType > current._count.entityType ? prev : current
            )
          : null;

      // Recent critical changes (DELETE actions)
      const recentCriticalChanges = await db.auditLog.findMany({
        where: {
          tenantId,
          action: 'DELETE',
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      return NextResponse.json({
        totalLogsCount,
        todayActivityCount,
        mostActiveUser,
        mostModifiedEntityType: mostModifiedEntityType
          ? {
              entityType: mostModifiedEntityType.entityType,
              count: mostModifiedEntityType._count.entityType,
            }
          : null,
        activityByDay: activityByDay.map((item) => ({
          date: item.date.toISOString().split('T')[0],
          count: Number(item.count),
        })),
        actionsBreakdown: actionsBreakdown.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
        entityTypesBreakdown: entityTypesBreakdown.map((item) => ({
          entityType: item.entityType,
          count: item._count.entityType,
        })),
        topActiveUsers: topUsersWithNames,
        recentCriticalChanges: recentCriticalChanges.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          user: log.user
            ? {
                name: log.user.fullName,
                email: log.user.email,
              }
            : null,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
        })),
      });
    } catch (error) {
      console.error('Error fetching audit log stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit log statistics' },
        { status: 500 }
      );
    }
  });
}
