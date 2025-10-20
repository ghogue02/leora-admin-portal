import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { PrismaClient } from '@prisma/client';

import { logChange, AuditOperation } from '@/lib/audit';

type UserAction = 'activate' | 'deactivate' | 'addRole' | 'removeRole';
type UserType = 'internal' | 'portal';

/**
 * POST /api/admin/bulk-operations/manage-users
 * Bulk user management operations (activate, deactivate, add/remove roles)
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json();
      const { userIds, userType, action, roleId } = body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { error: 'userIds array is required' },
          { status: 400 }
        );
      }

      if (!userType || !['internal', 'portal'].includes(userType)) {
        return NextResponse.json(
          { error: 'userType must be either "internal" or "portal"' },
          { status: 400 }
        );
      }

      const validActions: UserAction[] = ['activate', 'deactivate', 'addRole', 'removeRole'];
      if (!action || !validActions.includes(action as UserAction)) {
        return NextResponse.json(
          { error: `action must be one of: ${validActions.join(', ')}` },
          { status: 400 }
        );
      }

      // Role is required for addRole and removeRole actions
      if ((action === 'addRole' || action === 'removeRole') && !roleId) {
        return NextResponse.json(
          { error: 'roleId is required for addRole and removeRole actions' },
          { status: 400 }
        );
      }

      // Verify role exists if provided
      if (roleId) {
        const role = await db.role.findFirst({
          where: { id: roleId, tenantId },
          select: { id: true, name: true, code: true }
        });

        if (!role) {
          return NextResponse.json(
            { error: 'Role not found' },
            { status: 404 }
          );
        }
      }

      // Limit to prevent abuse
      if (userIds.length > 10000) {
        return NextResponse.json(
          { error: 'Maximum 10,000 users can be updated at once' },
          { status: 400 }
        );
      }

      const results = {
        successCount: 0,
        errors: [] as Array<{ userId: string; userName: string; error: string }>
      };

      // Process each user
      for (const userId of userIds) {
        try {
          await (db as PrismaClient).$transaction(async (tx) => {
            if (userType === 'internal') {
              // Process internal users (User model)
              const targetUser = await tx.user.findUnique({
                where: { id: userId, tenantId },
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  isActive: true,
                  roles: {
                    select: {
                      roleId: true
                    }
                  }
                }
              });

              if (!targetUser) {
                results.errors.push({
                  userId,
                  userName: 'Unknown',
                  error: 'User not found'
                });
                return;
              }

              // Prevent user from deactivating themselves
              if (action === 'deactivate' && userId === user.id) {
                results.errors.push({
                  userId,
                  userName: targetUser.fullName,
                  error: 'Cannot deactivate your own account'
                });
                return;
              }

              switch (action) {
                case 'activate':
                  if (targetUser.isActive) {
                    results.successCount++;
                    return;
                  }

                  await tx.user.update({
                    where: { id: userId },
                    data: { isActive: true }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'User',
                      entityId: userId,
                      changes: {
                        isActive: { old: false, new: true }
                      },
                      metadata: {
                        userName: targetUser.fullName,
                        email: targetUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'deactivate':
                  if (!targetUser.isActive) {
                    results.successCount++;
                    return;
                  }

                  await tx.user.update({
                    where: { id: userId },
                    data: { isActive: false }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'User',
                      entityId: userId,
                      changes: {
                        isActive: { old: true, new: false }
                      },
                      metadata: {
                        userName: targetUser.fullName,
                        email: targetUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'addRole':
                  // Check if user already has this role
                  const hasRole = targetUser.roles.some(r => r.roleId === roleId);
                  if (hasRole) {
                    results.successCount++;
                    return;
                  }

                  await tx.userRole.create({
                    data: {
                      userId,
                      roleId: roleId!
                    }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'User',
                      entityId: userId,
                      metadata: {
                        action: 'addRole',
                        roleId,
                        userName: targetUser.fullName,
                        email: targetUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'removeRole':
                  const existingRole = targetUser.roles.find(r => r.roleId === roleId);
                  if (!existingRole) {
                    results.successCount++;
                    return;
                  }

                  await tx.userRole.delete({
                    where: {
                      userId_roleId: {
                        userId,
                        roleId: roleId!
                      }
                    }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'User',
                      entityId: userId,
                      metadata: {
                        action: 'removeRole',
                        roleId,
                        userName: targetUser.fullName,
                        email: targetUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;
              }
            } else {
              // Process portal users (PortalUser model)
              const portalUser = await tx.portalUser.findUnique({
                where: { id: userId, tenantId },
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  status: true,
                  roles: {
                    select: {
                      roleId: true
                    }
                  }
                }
              });

              if (!portalUser) {
                results.errors.push({
                  userId,
                  userName: 'Unknown',
                  error: 'Portal user not found'
                });
                return;
              }

              switch (action) {
                case 'activate':
                  if (portalUser.status === 'ACTIVE') {
                    results.successCount++;
                    return;
                  }

                  await tx.portalUser.update({
                    where: { id: userId },
                    data: { status: 'ACTIVE' }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'PortalUser',
                      entityId: userId,
                      changes: {
                        status: { old: portalUser.status, new: 'ACTIVE' }
                      },
                      metadata: {
                        userName: portalUser.fullName,
                        email: portalUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'deactivate':
                  if (portalUser.status === 'DISABLED') {
                    results.successCount++;
                    return;
                  }

                  await tx.portalUser.update({
                    where: { id: userId },
                    data: { status: 'DISABLED' }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'PortalUser',
                      entityId: userId,
                      changes: {
                        status: { old: portalUser.status, new: 'DISABLED' }
                      },
                      metadata: {
                        userName: portalUser.fullName,
                        email: portalUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'addRole':
                  const hasRole = portalUser.roles.some(r => r.roleId === roleId);
                  if (hasRole) {
                    results.successCount++;
                    return;
                  }

                  await tx.portalUserRole.create({
                    data: {
                      portalUserId: userId,
                      roleId: roleId!
                    }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'PortalUser',
                      entityId: userId,
                      metadata: {
                        action: 'addRole',
                        roleId,
                        userName: portalUser.fullName,
                        email: portalUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;

                case 'removeRole':
                  const existingRole = portalUser.roles.find(r => r.roleId === roleId);
                  if (!existingRole) {
                    results.successCount++;
                    return;
                  }

                  await tx.portalUserRole.delete({
                    where: {
                      portalUserId_roleId: {
                        portalUserId: userId,
                        roleId: roleId!
                      }
                    }
                  });

                  await logChange(
                    {
                      tenantId,
                      userId: user.id,
                      action: AuditOperation.UPDATE,
                      entityType: 'PortalUser',
                      entityId: userId,
                      metadata: {
                        action: 'removeRole',
                        roleId,
                        userName: portalUser.fullName,
                        email: portalUser.email,
                        bulkOperation: true
                      }
                    },
                    tx,
                    request
                  );
                  break;
              }
            }

            results.successCount++;
          });
        } catch (error: any) {
          results.errors.push({
            userId,
            userName: 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        message: `Bulk user management completed. ${results.successCount} successful, ${results.errors.length} failed.`,
        successCount: results.successCount,
        errorCount: results.errors.length,
        errors: results.errors,
        action,
        userType
      });
    } catch (error: any) {
      console.error('Error in bulk user management:', error);
      return NextResponse.json(
        { error: 'Failed to perform bulk user management', details: error.message },
        { status: 500 }
      );
    }
  });
}
