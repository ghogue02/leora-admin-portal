import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation, calculateChanges } from '@/lib/audit';

/**
 * GET /api/admin/accounts/users/[id]
 * Get single user with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      const user = await db.user.findUnique({
        where: {
          id,
          tenantId
        },
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
          },
          salesRepProfile: {
            include: {
              customers: {
                select: {
                  id: true,
                  name: true,
                  accountNumber: true
                },
                take: 5
              }
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

      // Aggregate permissions from all roles
      const permissions = new Set<string>();
      user.roles.forEach(userRole => {
        userRole.role.permissions.forEach(rolePermission => {
          permissions.add(rolePermission.permission.code);
        });
      });

      const transformedUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          permissions: ur.role.permissions.map(rp => ({
            id: rp.permission.id,
            code: rp.permission.code,
            name: rp.permission.name
          }))
        })),
        permissions: Array.from(permissions),
        salesRep: user.salesRepProfile ? {
          id: user.salesRepProfile.id,
          territoryName: user.salesRepProfile.territoryName,
          deliveryDay: user.salesRepProfile.deliveryDay,
          weeklyRevenueQuota: user.salesRepProfile.weeklyRevenueQuota,
          monthlyRevenueQuota: user.salesRepProfile.monthlyRevenueQuota,
          quarterlyRevenueQuota: user.salesRepProfile.quarterlyRevenueQuota,
          annualRevenueQuota: user.salesRepProfile.annualRevenueQuota,
          weeklyCustomerQuota: user.salesRepProfile.weeklyCustomerQuota,
          sampleAllowancePerMonth: user.salesRepProfile.sampleAllowancePerMonth,
          isActive: user.salesRepProfile.isActive,
          customers: user.salesRepProfile.customers
        } : null
      };

      return NextResponse.json({ user: transformedUser });
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/accounts/users/[id]
 * Update user fields
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

      // Fetch existing user
      const existingUser = await db.user.findUnique({
        where: { id, tenantId }
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Validate email if changed
      if (body.email && body.email !== existingUser.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          );
        }

        // Check for duplicate
        const duplicate = await db.user.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: body.email
            }
          }
        });

        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: 'Email already in use by another user' },
            { status: 409 }
          );
        }
      }

      // Update user
      const updatedUser = await db.user.update({
        where: { id },
        data: {
          ...(body.email && { email: body.email }),
          ...(body.fullName && { fullName: body.fullName }),
          ...(body.hasOwnProperty('isActive') && { isActive: body.isActive }),
        },
        include: {
          roles: {
            include: {
              role: true
            }
          },
          salesRepProfile: true
        }
      });

      // Calculate and log changes
      const changes = calculateChanges(
        {
          email: existingUser.email,
          fullName: existingUser.fullName,
          isActive: existingUser.isActive
        },
        {
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          isActive: updatedUser.isActive
        }
      );

      if (Object.keys(changes).length > 0) {
        await logChange({
          tenantId,
          userId: context.user.id,
          action: AuditOperation.UPDATE,
          entityType: 'User',
          entityId: id,
          changes
        }, db, request);
      }

      return NextResponse.json({ user: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/accounts/users/[id]
 * Soft delete (deactivate) a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      // Check if user exists
      const user = await db.user.findUnique({
        where: { id, tenantId }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Soft delete - set isActive to false
      await db.user.update({
        where: { id },
        data: { isActive: false }
      });

      // Log deactivation
      await logChange({
        tenantId,
        userId: context.user.id,
        action: AuditOperation.STATUS_CHANGE,
        entityType: 'User',
        entityId: id,
        changes: {
          isActive: {
            old: true,
            new: false
          }
        },
        metadata: {
          action: 'deactivated'
        }
      }, db, request);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deactivating user:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate user' },
        { status: 500 }
      );
    }
  });
}
