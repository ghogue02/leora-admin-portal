import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters, search, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '100');
      const skip = (page - 1) * limit;

      // Filters
      const userId = searchParams.get('userId');
      const action = searchParams.get('action'); // Comma-separated: CREATE,UPDATE,DELETE
      const entityType = searchParams.get('entityType');
      const entityId = searchParams.get('entityId');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');

      // Sorting
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

      // Build where clause
      const where: Prisma.AuditLogWhereInput = {
        tenantId,
      };

      // User filter
      if (userId) {
        where.userId = userId;
      }

      // Action filter (multiple)
      if (action) {
        const actions = action.split(',').filter(Boolean);
        if (actions.length > 0) {
          where.action = { in: actions };
        }
      }

      // Entity type filter
      if (entityType) {
        where.entityType = entityType;
      }

      // Entity ID search
      if (entityId) {
        where.entityId = entityId;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          // Set to end of day
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
      }

      // Build order by
      const orderBy: Prisma.AuditLogOrderByWithRelationInput = {};
      if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'action') {
        orderBy.action = sortOrder;
      } else if (sortBy === 'entityType') {
        orderBy.entityType = sortOrder;
      }

      // Execute queries
      const [logs, totalCount] = await Promise.all([
        db.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.auditLog.count({ where }),
      ]);

      // Transform data
      const transformedLogs = logs.map((log) => {
        // Extract changed fields for summary
        let changedFields: string[] = [];
        if (log.changes && typeof log.changes === 'object') {
          changedFields = Object.keys(log.changes);
        }

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
          entityType: log.entityType,
          entityId: log.entityId,
          changedFields,
          changedFieldsCount: changedFields.length,
        };
      });

      return NextResponse.json({
        logs: transformedLogs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);

      // Check if this is a "table doesn't exist" error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        return NextResponse.json(
          {
            error: 'AuditLog table not found',
            setupRequired: true,
            message: 'The AuditLog table has not been created yet. Please run database migrations.',
            instructions: [
              'Run: npx prisma migrate dev',
              'Or run: npx prisma db push',
            ],
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }
  });
}
