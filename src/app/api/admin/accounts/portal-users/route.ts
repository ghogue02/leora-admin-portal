import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, type AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation } from '@/lib/audit';
import { Prisma, type PortalUserStatus } from '@prisma/client';

type CreatePortalUserPayload = {
  email: string;
  fullName: string;
  customerId: string;
  roleIds?: string[];
};

/**
 * GET /api/admin/accounts/portal-users
 * List portal users with filters, search, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);

      const page = Number.parseInt(searchParams.get('page') || '1');
      const limit = Number.parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // Search
      const search = searchParams.get('search') || '';

      // Filters
      const role = searchParams.get('role');
      const statusParam = searchParams.get('status');
      const status = statusParam && ['ACTIVE','INVITED','DISABLED'].includes(statusParam)
        ? (statusParam as PortalUserStatus)
        : undefined;
      const customerId = searchParams.get('customerId');

      // Sorting
      const sortBy = searchParams.get('sortBy') || 'fullName';
      const sortOrder = (searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc');

      // Build where clause
      const where: Prisma.PortalUserWhereInput = {
        tenantId,
      };

      // Search filter
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Role filter
      if (role) {
        where.roles = {
          some: {
            role: {
              code: role
            }
          }
        };
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      // Customer filter
      if (customerId) {
        where.customerId = customerId;
      }

      // Build order by
      const orderBy: Prisma.PortalUserOrderByWithRelationInput = {};

      switch (sortBy) {
        case 'email':
          orderBy.email = sortOrder;
          break;
        case 'status':
          orderBy.status = sortOrder;
          break;
        case 'createdAt':
          orderBy.createdAt = sortOrder;
          break;
        case 'lastLoginAt':
          orderBy.lastLoginAt = sortOrder;
          break;
        default:
          orderBy.fullName = sortOrder;
      }

      // Execute queries
      const [portalUsers, totalCount] = await Promise.all([
        db.portalUser.findMany({
          where,
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
            },
            customer: {
              select: {
                id: true,
                name: true,
                accountNumber: true
              }
            }
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.portalUser.count({ where }),
      ]);

      // Transform data
      const transformedPortalUsers = portalUsers.map(portalUser => ({
        id: portalUser.id,
        email: portalUser.email,
        fullName: portalUser.fullName,
        portalUserKey: portalUser.portalUserKey,
        status: portalUser.status,
        roles: portalUser.roles.map(pur => ({
          id: pur.role.id,
          name: pur.role.name,
          code: pur.role.code
        })),
        primaryRole: portalUser.roles[0]?.role.name || 'No Role',
        customer: portalUser.customer ? {
          id: portalUser.customer.id,
          name: portalUser.customer.name,
          accountNumber: portalUser.customer.accountNumber
        } : null,
        lastLoginAt: portalUser.lastLoginAt,
        createdAt: portalUser.createdAt,
        updatedAt: portalUser.updatedAt,
      }));

      return NextResponse.json({
        portalUsers: transformedPortalUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching portal users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch portal users' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/accounts/portal-users
 * Create a new portal user
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = (await request.json().catch(() => null)) as CreatePortalUserPayload | null;
      if (!body) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      const { email, fullName, customerId } = body;
      const roleIds = Array.isArray(body.roleIds)
        ? body.roleIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : [];

      if (!email || !fullName || !customerId) {
        return NextResponse.json(
          { error: 'Email, full name, and customer are required' },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check for duplicate email
      const existingPortalUser = await db.portalUser.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email
          }
        }
      });

      if (existingPortalUser) {
        return NextResponse.json(
          { error: 'Portal user with this email already exists' },
          { status: 409 }
        );
      }

      // Verify customer exists
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId
        }
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Create portal user and role assignments in a transaction
      const portalUser = await db.$transaction(async (tx) => {
        // Create portal user
        const newPortalUser = await tx.portalUser.create({
          data: {
            tenantId,
            email,
            fullName,
            customerId,
            status: 'INVITED', // Default status for new portal users
          }
        });

        // Create role assignments
        if (roleIds && roleIds.length > 0) {
          await tx.portalUserRole.createMany({
            data: roleIds.map((roleId) => ({
              portalUserId: newPortalUser.id,
              roleId
            }))
          });
        }

        // Fetch complete portal user with relations
        return tx.portalUser.findUnique({
          where: { id: newPortalUser.id },
          include: {
            roles: {
              include: {
                role: true
              }
            },
            customer: true
          }
        });
      });

      // Log creation
      if (portalUser) {
        await logChange({
          tenantId,
          userId: context.user.id,
          action: AuditOperation.CREATE,
          entityType: 'PortalUser',
          entityId: portalUser.id,
          metadata: {
            email,
            fullName,
            customerId,
            roles: roleIds
          }
        }, db, request);
      }

      return NextResponse.json({ portalUser }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating portal user:', error);

      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
        return NextResponse.json(
          { error: 'Portal user with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create portal user' },
        { status: 500 }
      );
    }
  });
}
