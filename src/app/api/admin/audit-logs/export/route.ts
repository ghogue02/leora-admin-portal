import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

/**
 * POST /api/admin/audit-logs/export
 * Export audit logs as CSV with filters
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = await request.json();

      // Extract filters from body
      const { userId, action, entityType, entityId, dateFrom, dateTo } = body;

      // Build where clause (same as GET route)
      const where: Prisma.AuditLogWhereInput = {
        tenantId,
      };

      if (userId) where.userId = userId;
      if (action) {
        const actions = action.split(',').filter(Boolean);
        if (actions.length > 0) {
          where.action = { in: actions };
        }
      }
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
      }

      // Fetch logs (limit to 10,000)
      const logs = await db.auditLog.findMany({
        where,
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
        take: 10000,
      });

      // Generate CSV
      const csvRows: string[] = [];

      // Header
      csvRows.push(
        'Timestamp,User Name,User Email,Action,Entity Type,Entity ID,Changes Summary,IP Address,Reason'
      );

      // Data rows
      for (const log of logs) {
        const timestamp = log.createdAt.toISOString();
        const userName = log.user?.fullName || 'System';
        const userEmail = log.user?.email || '';
        const action = log.action;
        const entityType = log.entityType;
        const entityId = log.entityId;

        // Changes summary
        let changesSummary = '';
        if (log.changes && typeof log.changes === 'object') {
          const changedFields = Object.keys(log.changes);
          changesSummary = changedFields.join(', ');
        }

        // Metadata
        const metadata = (log.metadata as Record<string, unknown>) || {};
        const ipAddress = String(metadata.ipAddress || '');
        const reason = String(metadata.reason || '');

        // Escape CSV fields
        const escapeCSV = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        csvRows.push(
          [
            escapeCSV(timestamp),
            escapeCSV(userName),
            escapeCSV(userEmail),
            escapeCSV(action),
            escapeCSV(entityType),
            escapeCSV(entityId),
            escapeCSV(changesSummary),
            escapeCSV(ipAddress),
            escapeCSV(reason),
          ].join(',')
        );
      }

      const csvContent = csvRows.join('\n');

      // Return CSV file
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to export audit logs' },
        { status: 500 }
      );
    }
  });
}
