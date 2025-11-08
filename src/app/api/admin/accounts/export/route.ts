import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, type AdminSessionContext } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV, formatDateTimeForCSV } from '@/lib/csv-helper';
import { formatUTCDate } from '@/lib/dates';
import type { Prisma } from '@prisma/client';

type ExportFilters = {
  search?: string;
  isActive?: boolean;
  status?: string;
  customerId?: string;
};

type ExportRequestBody = {
  userType?: 'internal' | 'portal';
  filters?: ExportFilters;
};

/**
 * POST /api/admin/accounts/export
 * Export users (internal or portal) to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = (await request.json().catch(() => ({}))) as ExportRequestBody;
      const { userType = 'internal', filters = {} } = body;

      if (!['internal', 'portal'].includes(userType)) {
        return NextResponse.json(
          { error: 'userType must be "internal" or "portal"' },
          { status: 400 }
        );
      }

      const exportData: Record<string, string | number | null>[] = [];

      if (userType === 'internal') {
        // Export internal users
        const where: Prisma.UserWhereInput = { tenantId };

        if (filters.search) {
          where.OR = [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.isActive !== undefined) {
          where.isActive = filters.isActive;
        }

        const users = await db.user.findMany({
          where,
          include: {
            roles: {
              include: {
                role: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
            salesRepProfile: {
              select: {
                territoryName: true,
              },
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          take: 10000,
        });

        users.forEach((u) => {
          exportData.push({
            'User ID': u.id,
            'Full Name': u.fullName,
            'Email': u.email,
            'Roles': u.roles.map((r) => r.role.name).join('; '),
            'Role Codes': u.roles.map((r) => r.role.code).join('; '),
            'Territory': u.salesRepProfile?.territoryName || '',
            'Status': u.isActive ? 'Active' : 'Inactive',
            'Last Login': formatDateTimeForCSV(u.lastLoginAt),
            'Created At': formatDateTimeForCSV(u.createdAt),
          });
        });
      } else {
        // Export portal users
        const where: Prisma.PortalUserWhereInput = { tenantId };

        if (filters.search) {
          where.OR = [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.customerId) {
          where.customerId = filters.customerId;
        }

        const portalUsers = await db.portalUser.findMany({
          where,
          include: {
            roles: {
              include: {
                role: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
            customer: {
              select: {
                name: true,
                accountNumber: true,
              },
            },
          },
          orderBy: {
            fullName: 'asc',
          },
          take: 10000,
        });

        portalUsers.forEach((u) => {
          exportData.push({
            'User ID': u.id,
            'Full Name': u.fullName,
            'Email': u.email,
            'Customer': u.customer?.name || 'No Customer',
            'Account Number': u.customer?.accountNumber || '',
            'Roles': u.roles.map((r) => r.role.name).join('; '),
            'Role Codes': u.roles.map((r) => r.role.code).join('; '),
            'Status': u.status,
            'Last Login': formatDateTimeForCSV(u.lastLoginAt),
            'Created At': formatDateTimeForCSV(u.createdAt),
          });
        });
      }

      const headers = userType === 'internal'
        ? ['User ID', 'Full Name', 'Email', 'Roles', 'Role Codes', 'Territory', 'Status', 'Last Login', 'Created At']
        : ['User ID', 'Full Name', 'Email', 'Customer', 'Account Number', 'Roles', 'Role Codes', 'Status', 'Last Login', 'Created At'];

      const csvContent = arrayToCSV(exportData, headers);

      // Add metadata header
      const metadata = [
        `# ${userType === 'internal' ? 'Internal' : 'Portal'} Users Export`,
        `# Exported by: ${user.fullName}`,
        `# Exported at: ${new Date().toISOString()}`,
        `# Total records: ${exportData.length}`,
        ...(exportData.length >= 10000 ? ['# WARNING: Limited to 10,000 records'] : []),
        '',
      ].join('\n');

      return createCSVResponse(
        metadata + csvContent,
        `${userType}-users-export-${formatUTCDate(new Date())}.csv`
      );
    } catch (error) {
      console.error('Error exporting users:', error);
      return NextResponse.json(
        { error: 'Failed to export users' },
        { status: 500 }
      );
    }
  });
}
