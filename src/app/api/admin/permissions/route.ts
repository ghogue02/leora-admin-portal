import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/permissions
 * List all available permissions
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { db } = context;
    try {
      const permissions = await db.permission.findMany({
        include: {
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              }
            }
          }
        },
        orderBy: {
          code: 'asc'
        }
      });

      const transformedPermissions = permissions.map(permission => ({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        roles: permission.roles.map(rp => ({
          id: rp.role.id,
          name: rp.role.name,
          code: rp.role.code
        })),
        roleCount: permission.roles.length,
        createdAt: permission.createdAt
      }));

      return NextResponse.json({
        permissions: transformedPermissions
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }
  });
}
