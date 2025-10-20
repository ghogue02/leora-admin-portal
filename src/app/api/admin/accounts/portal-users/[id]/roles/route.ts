import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation } from '@/lib/audit';
import { PrismaClient } from '@prisma/client';

/**
 * PUT /api/admin/accounts/portal-users/[id]/roles
 * Update portal user roles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      const body = await request.json();
      const { roleIds } = body;

      if (!Array.isArray(roleIds)) {
        return NextResponse.json(
          { error: 'roleIds must be an array' },
          { status: 400 }
        );
      }

      // Check if portal user exists
      const portalUser = await db.portalUser.findUnique({
        where: { id, tenantId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!portalUser) {
        return NextResponse.json(
          { error: 'Portal user not found' },
          { status: 404 }
        );
      }

      // Validate that all role IDs exist and belong to tenant
      if (roleIds.length > 0) {
        const roles = await db.role.findMany({
          where: {
            id: { in: roleIds },
            tenantId
          }
        });

        if (roles.length !== roleIds.length) {
          return NextResponse.json(
            { error: 'One or more invalid role IDs' },
            { status: 400 }
          );
        }
      }

      const oldRoleIds = portalUser.roles.map(pur => pur.roleId);
      const oldRoleNames = portalUser.roles.map(pur => pur.role.name);

      // Update roles in a transaction
      const updatedPortalUser = await (db as PrismaClient).$transaction(async (tx) => {
        // Delete existing role assignments
        await tx.portalUserRole.deleteMany({
          where: { portalUserId: id }
        });

        // Create new role assignments
        if (roleIds.length > 0) {
          await tx.portalUserRole.createMany({
            data: roleIds.map((roleId: string) => ({
              portalUserId: id,
              roleId
            }))
          });
        }

        // Fetch updated portal user with new roles
        return tx.portalUser.findUnique({
          where: { id },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        });
      });

      const newRoleNames = updatedPortalUser!.roles.map(pur => pur.role.name);

      // Log role changes
      await logChange({
        tenantId,
        userId: context.user.id,
        action: AuditOperation.UPDATE,
        entityType: 'PortalUser',
        entityId: id,
        changes: {
          roles: {
            old: oldRoleNames,
            new: newRoleNames
          }
        },
        metadata: {
          oldRoleIds,
          newRoleIds: roleIds,
          action: 'roles_updated'
        }
      }, db, request);

      return NextResponse.json({
        portalUser: updatedPortalUser,
        message: 'Roles updated successfully'
      });
    } catch (error) {
      console.error('Error updating portal user roles:', error);
      return NextResponse.json(
        { error: 'Failed to update portal user roles' },
        { status: 500 }
      );
    }
  });
}
