import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logCustomerCreate } from '@/lib/audit';
import { Prisma, CustomerRiskStatus } from '@prisma/client';

const CUSTOMER_RISK_STATUS_SET = new Set(Object.values(CustomerRiskStatus));

const parseRiskStatuses = (value: string): CustomerRiskStatus[] =>
  value
    .split(',')
    .map((status) => status.trim())
    .filter((status): status is CustomerRiskStatus => CUSTOMER_RISK_STATUS_SET.has(status as CustomerRiskStatus));

/**
 * GET /api/admin/customers
 * List customers with filters, search, sorting, and pagination
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
      const territory = searchParams.get('territory');
      const salesRepId = searchParams.get('salesRepId');
      const riskStatus = searchParams.get('riskStatus');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');

      // Sorting
      const sortBy = searchParams.get('sortBy') || 'name';
      const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

      // Build where clause
      const where: Prisma.CustomerWhereInput = {
        tenantId,
        isPermanentlyClosed: false, // Don't show closed by default
      };

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { accountNumber: { contains: search, mode: 'insensitive' } },
          { billingEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Territory filter (via SalesRep)
      if (territory) {
        where.salesRep = {
          territoryName: territory
        };
      }

      // Sales rep filter
      if (salesRepId) {
        where.salesRepId = salesRepId;
      }

      // Risk status filter
      if (riskStatus) {
        const statuses = parseRiskStatuses(riskStatus);
        if (statuses.length > 0) {
          where.riskStatus = { in: statuses };
        }
      }

      // Date range filter (last order date)
      if (dateFrom || dateTo) {
        where.lastOrderDate = {};
        if (dateFrom) {
          where.lastOrderDate.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.lastOrderDate.lte = new Date(dateTo);
        }
      }

      // Build order by
      const orderBy: Prisma.CustomerOrderByWithRelationInput = {};

      switch (sortBy) {
        case 'accountNumber':
          orderBy.accountNumber = sortOrder;
          break;
        case 'lastOrderDate':
          orderBy.lastOrderDate = sortOrder;
          break;
        case 'riskStatus':
          orderBy.riskStatus = sortOrder;
          break;
        case 'territory':
          orderBy.salesRep = { territoryName: sortOrder };
          break;
        default:
          orderBy.name = sortOrder;
      }

      // Execute queries
      const [customers, totalCount] = await Promise.all([
        db.customer.findMany({
          where,
          include: {
            salesRep: {
              include: {
                user: {
                  select: { fullName: true, email: true }
                }
              }
            },
            orders: {
              select: { id: true },
              where: { status: { not: 'CANCELLED' } }
            },
            assignments: {
              where: { unassignedAt: null },
              take: 1,
              orderBy: { assignedAt: 'desc' }
            }
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.customer.count({ where }),
      ]);

      // Transform data
      const transformedCustomers = customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        accountNumber: customer.accountNumber,
        billingEmail: customer.billingEmail,
        phone: customer.phone,
        territory: customer.salesRep?.territoryName || null,
        salesRep: customer.salesRep ? {
          id: customer.salesRep.id,
          name: customer.salesRep.user.fullName,
          email: customer.salesRep.user.email,
        } : null,
        lastOrderDate: customer.lastOrderDate,
        totalOrders: customer.orders.length,
        riskStatus: customer.riskStatus,
        city: customer.city,
        state: customer.state,
        createdAt: customer.createdAt,
      }));

      return NextResponse.json({
        customers: transformedCustomers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = await request.json();

      // Validate required fields
      const { name, billingEmail, phone, street1, city, state, postalCode } = body;

      if (!name || !billingEmail) {
        return NextResponse.json(
          { error: 'Name and billing email are required' },
          { status: 400 }
        );
      }

      // Generate account number if not provided
      let accountNumber = body.accountNumber;
      if (!accountNumber) {
        const count = await db.customer.count({
          where: { tenantId }
        });
        accountNumber = `CUST-${(count + 1).toString().padStart(6, '0')}`;
      }

      const googlePlaceTypes = Array.isArray(body.googlePlaceTypes)
        ? (body.googlePlaceTypes as unknown[])
            .filter((type): type is string => typeof type === 'string')
            .map((type) => type.trim())
            .filter((type, index, arr) => type.length && arr.indexOf(type) === index)
        : [];

      // Create customer
      const customer = await db.customer.create({
        data: {
          tenantId,
          name,
          accountNumber,
          billingEmail,
          phone,
          internationalPhone: body.internationalPhone || null,
          street1,
          street2: body.street2 || null,
          city,
          state,
          postalCode,
          country: body.country || 'US',
          paymentTerms: body.paymentTerms || 'Net 30',
          salesRepId: body.salesRepId || null,
          website: body.website || null,
          googlePlaceId: body.googlePlaceId || null,
          googlePlaceName: body.googlePlaceName || null,
          googleFormattedAddress: body.googleFormattedAddress || null,
          googleMapsUrl: body.googleMapsUrl || null,
          googleBusinessStatus: body.googleBusinessStatus || null,
          googlePlaceTypes,
        },
        include: {
          salesRep: {
            include: {
              user: {
                select: { fullName: true }
              }
            }
          }
        }
      });

      // Create initial customer assignment if sales rep assigned
      if (customer.salesRepId) {
        await db.customerAssignment.create({
          data: {
            tenantId,
            customerId: customer.id,
            salesRepId: customer.salesRepId,
          }
        });
      }

      // Log creation
      await logCustomerCreate(
        tenantId,
        context.user.id,
        customer.id,
        { name, accountNumber, billingEmail }
      );

      return NextResponse.json({ customer }, { status: 201 });
    } catch (error: unknown) {
      console.error('Error creating customer:', error);

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Customer with this account number already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }
  });
}
