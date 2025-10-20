import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation } from '@/lib/audit';
import { PrismaClient } from '@prisma/client';

/**
 * PUT /api/admin/accounts/users/[id]/roles
 * Update user roles
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

      // Check if user exists
      const user = await db.user.findUnique({
        where: { id, tenantId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
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

      const oldRoleIds = user.roles.map(ur => ur.roleId);
      const oldRoleNames = user.roles.map(ur => ur.role.name);

      // Update roles in a transaction
      const updatedUser = await (db as PrismaClient).$transaction(async (tx) => {
        // Delete existing role assignments
        await tx.userRole.deleteMany({
          where: { userId: id }
        });

        // Create new role assignments
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId: string) => ({
              userId: id,
              roleId
            }))
          });
        }

        // Fetch updated user with new roles
        return tx.user.findUnique({
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

      const newRoleNames = updatedUser!.roles.map(ur => ur.role.name);

      // Log role changes
      await logChange({
        tenantId,
        userId: context.user.id,
        action: AuditOperation.UPDATE,
        entityType: 'User',
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
        user: updatedUser,
        message: 'Roles updated successfully'
      });
    } catch (error) {
      console.error('Error updating user roles:', error);
      return NextResponse.json(
        { error: 'Failed to update user roles' },
        { status: 500 }
      );
    }
  });
}
