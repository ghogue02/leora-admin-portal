import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/roles
 * List all available roles with permissions
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);

      // Optional filter by type (e.g., "internal" vs "portal")
      const type = searchParams.get('type'); // Could be used to filter roles

      const roles = await db.role.findMany({
        where: {
          tenantId,
        },
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              userRoles: true,
              portalRoles: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      const transformedRoles = roles.map(role => ({
        id: role.id,
        name: role.name,
        code: role.code,
        isDefault: role.isDefault,
        permissions: role.permissions.map(rp => ({
          id: rp.permission.id,
          code: rp.permission.code,
          name: rp.permission.name
        })),
        userCount: role._count.userRoles,
        portalUserCount: role._count.portalRoles,
        totalAssigned: role._count.userRoles + role._count.portalRoles,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }));

      // Filter by type if needed (based on role code convention)
      let filteredRoles = transformedRoles;
      if (type === 'internal') {
        // Filter for internal user roles (e.g., sales.admin, admin, sales.manager)
        filteredRoles = transformedRoles.filter(r =>
          !r.code.startsWith('portal.')
        );
      } else if (type === 'portal') {
        // Filter for portal user roles (e.g., portal.admin, portal.viewer)
        filteredRoles = transformedRoles.filter(r =>
          r.code.startsWith('portal.')
        );
      }

      return NextResponse.json({
        roles: filteredRoles
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      );
    }
  });
}
