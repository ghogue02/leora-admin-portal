import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation, calculateChanges } from '@/lib/audit';

/**
 * GET /api/admin/accounts/portal-users/[id]
 * Get single portal user with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      const portalUser = await db.portalUser.findUnique({
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
          customer: {
            include: {
              salesRep: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          sessions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          }
        }
      });

      if (!portalUser) {
        return NextResponse.json(
          { error: 'Portal user not found' },
          { status: 404 }
        );
      }

      // Aggregate permissions from all roles
      const permissions = new Set<string>();
      portalUser.roles.forEach(portalUserRole => {
        portalUserRole.role.permissions.forEach(rolePermission => {
          permissions.add(rolePermission.permission.code);
        });
      });

      const transformedPortalUser = {
        id: portalUser.id,
        email: portalUser.email,
        fullName: portalUser.fullName,
        portalUserKey: portalUser.portalUserKey,
        status: portalUser.status,
        lastLoginAt: portalUser.lastLoginAt,
        createdAt: portalUser.createdAt,
        updatedAt: portalUser.updatedAt,
        roles: portalUser.roles.map(pur => ({
          id: pur.role.id,
          name: pur.role.name,
          code: pur.role.code,
          permissions: pur.role.permissions.map(rp => ({
            id: rp.permission.id,
            code: rp.permission.code,
            name: rp.permission.name
          }))
        })),
        permissions: Array.from(permissions),
        customer: portalUser.customer ? {
          id: portalUser.customer.id,
          name: portalUser.customer.name,
          accountNumber: portalUser.customer.accountNumber,
          billingEmail: portalUser.customer.billingEmail,
          phone: portalUser.customer.phone,
          city: portalUser.customer.city,
          state: portalUser.customer.state,
          salesRep: portalUser.customer.salesRep ? {
            id: portalUser.customer.salesRep.id,
            name: portalUser.customer.salesRep.user.fullName,
            email: portalUser.customer.salesRep.user.email,
            territoryName: portalUser.customer.salesRep.territoryName
          } : null
        } : null,
        recentSessions: portalUser.sessions.map(session => ({
          id: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        }))
      };

      return NextResponse.json({ portalUser: transformedPortalUser });
    } catch (error) {
      console.error('Error fetching portal user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch portal user' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/accounts/portal-users/[id]
 * Update portal user fields
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

      // Fetch existing portal user
      const existingPortalUser = await db.portalUser.findUnique({
        where: { id, tenantId }
      });

      if (!existingPortalUser) {
        return NextResponse.json(
          { error: 'Portal user not found' },
          { status: 404 }
        );
      }

      // Validate email if changed
      if (body.email && body.email !== existingPortalUser.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          );
        }

        // Check for duplicate
        const duplicate = await db.portalUser.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: body.email
            }
          }
        });

        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: 'Email already in use by another portal user' },
            { status: 409 }
          );
        }
      }

      // Validate customer if changed
      if (body.customerId) {
        const customer = await db.customer.findUnique({
          where: {
            id: body.customerId,
            tenantId
          }
        });

        if (!customer) {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          );
        }
      }

      // Update portal user
      const updatedPortalUser = await db.portalUser.update({
        where: { id },
        data: {
          ...(body.email && { email: body.email }),
          ...(body.fullName && { fullName: body.fullName }),
          ...(body.customerId && { customerId: body.customerId }),
          ...(body.status && { status: body.status }),
        },
        include: {
          roles: {
            include: {
              role: true
            }
          },
          customer: true
        }
      });

      // Calculate and log changes
      const changes = calculateChanges(
        {
          email: existingPortalUser.email,
          fullName: existingPortalUser.fullName,
          customerId: existingPortalUser.customerId,
          status: existingPortalUser.status
        },
        {
          email: updatedPortalUser.email,
          fullName: updatedPortalUser.fullName,
          customerId: updatedPortalUser.customerId,
          status: updatedPortalUser.status
        }
      );

      if (Object.keys(changes).length > 0) {
        await logChange({
          tenantId,
          userId: context.user.id,
          action: AuditOperation.UPDATE,
          entityType: 'PortalUser',
          entityId: id,
          changes
        }, db, request);
      }

      return NextResponse.json({ portalUser: updatedPortalUser });
    } catch (error) {
      console.error('Error updating portal user:', error);
      return NextResponse.json(
        { error: 'Failed to update portal user' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/admin/accounts/portal-users/[id]
 * Deactivate a portal user (set status to DISABLED)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      // Check if portal user exists
      const portalUser = await db.portalUser.findUnique({
        where: { id, tenantId }
      });

      if (!portalUser) {
        return NextResponse.json(
          { error: 'Portal user not found' },
          { status: 404 }
        );
      }

      // Set status to DISABLED
      await db.portalUser.update({
        where: { id },
        data: { status: 'DISABLED' }
      });

      // Log deactivation
      await logChange({
        tenantId,
        userId: context.user.id,
        action: AuditOperation.STATUS_CHANGE,
        entityType: 'PortalUser',
        entityId: id,
        changes: {
          status: {
            old: portalUser.status,
            new: 'DISABLED'
          }
        },
        metadata: {
          action: 'disabled'
        }
      }, db, request);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error disabling portal user:', error);
      return NextResponse.json(
        { error: 'Failed to disable portal user' },
        { status: 500 }
      );
    }
  });
}
