import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV, formatDateTimeForCSV } from '@/lib/csv-helper';

/**
 * POST /api/admin/accounts/export
 * Export users (internal or portal) to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json().catch(() => ({}));
      const { userType = 'internal', filters = {} } = body;

      if (!['internal', 'portal'].includes(userType)) {
        return NextResponse.json(
          { error: 'userType must be "internal" or "portal"' },
          { status: 400 }
        );
      }

      let exportData: any[] = [];

      if (userType === 'internal') {
        // Export internal users
        const where: any = { tenantId };

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

        exportData = users.map((u) => ({
          'User ID': u.id,
          'Full Name': u.fullName,
          'Email': u.email,
          'Roles': u.roles.map((r) => r.role.name).join('; '),
          'Role Codes': u.roles.map((r) => r.role.code).join('; '),
          'Territory': u.salesRepProfile?.territoryName || '',
          'Status': u.isActive ? 'Active' : 'Inactive',
          'Last Login': formatDateTimeForCSV(u.lastLoginAt),
          'Created At': formatDateTimeForCSV(u.createdAt),
        }));
      } else {
        // Export portal users
        const where: any = { tenantId };

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

        exportData = portalUsers.map((u) => ({
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
        }));
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
        `${userType}-users-export-${new Date().toISOString().split('T')[0]}.csv`
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
