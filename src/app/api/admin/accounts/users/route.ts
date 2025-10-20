import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation } from '@/lib/audit';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/accounts/users
 * List internal users with filters, search, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // Search
      const search = searchParams.get('search') || '';

      // Filters
      const role = searchParams.get('role');
      const status = searchParams.get('status'); // 'active' or 'inactive'
      const territory = searchParams.get('territory');

      // Sorting
      const sortBy = searchParams.get('sortBy') || 'fullName';
      const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

      // Build where clause
      const where: Prisma.UserWhereInput = {
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
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // Territory filter (via SalesRep)
      if (territory) {
        where.salesRepProfile = {
          territoryName: territory
        };
      }

      // Build order by
      const orderBy: Prisma.UserOrderByWithRelationInput = {};

      switch (sortBy) {
        case 'email':
          orderBy.email = sortOrder;
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
      const [users, totalCount] = await Promise.all([
        db.user.findMany({
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
            salesRepProfile: {
              select: {
                id: true,
                territoryName: true,
                isActive: true
              }
            }
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.user.count({ where }),
      ]);

      // Transform data
      const transformedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code
        })),
        primaryRole: user.roles[0]?.role.name || 'No Role',
        territory: user.salesRepProfile?.territoryName || null,
        linkedSalesRepId: user.salesRepProfile?.id || null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return NextResponse.json({
        users: transformedUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/accounts/users
 * Create a new internal user
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = await request.json();

      // Validate required fields
      const { email, fullName, password, roleIds, createSalesRep, territoryName } = body;

      if (!email || !fullName || !password) {
        return NextResponse.json(
          { error: 'Email, full name, and password are required' },
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
      const existingUser = await db.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email
          }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await db.user.create({
        data: {
          tenantId,
          email,
          fullName,
            hashedPassword,
            isActive: true,
          }
        });

      // Create role assignments if provided
      if (roleIds && roleIds.length > 0) {
        await db.userRole.createMany({
          data: roleIds.map((roleId: string) => ({
            userId: newUser.id,
            roleId,
          })),
        });
      }

      // Create SalesRep profile if requested
      if (createSalesRep && territoryName) {
        await db.salesRep.create({
          data: {
            tenantId,
            userId: newUser.id,
            territoryName,
            isActive: true,
          },
        });
      }

      // Fetch complete user with relations
      const user = await db.user.findUnique({
        where: { id: newUser.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          salesRepProfile: true,
        },
      });

      // Log creation
      await logChange(
        {
          tenantId,
          userId: context.user.id,
          action: AuditOperation.CREATE,
          entityType: 'User',
          entityId: newUser.id,
          metadata: {
            email,
            fullName,
            roles: roleIds,
            createdSalesRep: createSalesRep,
          },
        },
        db,
        request
      );

      return NextResponse.json({ user }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating user:', error);

      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
  });
}
