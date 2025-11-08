import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logCustomerUpdate } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import type { DeliveryWindow } from '@/types/customer';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function sanitizeDeliveryWindows(input: unknown): { valid: boolean; value?: DeliveryWindow[]; error?: string } {
  if (typeof input === 'undefined') {
    return { valid: false };
  }

  if (input === null) {
    return { valid: true, value: [] };
  }

  if (!Array.isArray(input)) {
    return { valid: false, error: 'deliveryWindows must be an array' };
  }

  const cleaned: DeliveryWindow[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: 'deliveryWindows entries must be objects' };
    }

    const type = (raw as { type?: string }).type;
    if (type === 'BEFORE' || type === 'AFTER') {
      const time = (raw as { time?: unknown }).time;
      if (!isValidTime(time)) {
        return { valid: false, error: `delivery window ${type} requires valid HH:MM time` };
      }
      cleaned.push({ type, time });
      continue;
    }

    if (type === 'BETWEEN') {
      const startTime = (raw as { startTime?: unknown }).startTime;
      const endTime = (raw as { endTime?: unknown }).endTime;
      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return { valid: false, error: 'delivery window BETWEEN requires startTime and endTime (HH:MM)' };
      }
      cleaned.push({ type, startTime, endTime });
      continue;
    }

    return { valid: false, error: 'deliveryWindows entries must specify a valid type' };
  }

  return { valid: true, value: cleaned };
}

function formatDeliveryWindow(window: DeliveryWindow | undefined): string | null {
  if (!window) return null;
  switch (window.type) {
    case 'BEFORE':
      return `Before ${window.time}`;
    case 'AFTER':
      return `After ${window.time}`;
    case 'BETWEEN':
      return `Between ${window.startTime} - ${window.endTime}`;
    default:
      return null;
  }
}

const ALLOWED_CUSTOMER_FIELDS = [
  'name',
  'billingEmail',
  'phone',
  'street1',
  'street2',
  'city',
  'state',
  'postalCode',
  'country',
  'paymentTerms',
  'licenseNumber',
  'deliveryInstructions',
  'deliveryMethod',
  'paymentMethod',
  'defaultWarehouseLocation',
  'deliveryWindows',
  'salesRepId',
  'isPermanentlyClosed',
  'closedReason',
  'type',
  'volumeCapacity',
  'featurePrograms',
] as const satisfies readonly (keyof Prisma.CustomerUpdateInput)[];

type AllowedCustomerField = (typeof ALLOWED_CUSTOMER_FIELDS)[number];

type UpdateCustomerPayload = Partial<Record<AllowedCustomerField, unknown>> & {
  updateReason?: string;
};

/**
 * GET /api/admin/customers/[id]
 * Get single customer with detailed information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { id } = await params;

      const customer = await db.customer.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          salesRep: {
            include: {
              user: {
                select: { fullName: true, email: true }
              }
            }
          },
          duplicateFlags: {
            where: {
              status: 'OPEN',
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              notes: true,
              createdAt: true,
              duplicateOfCustomerId: true,
              duplicateOf: {
                select: {
                  id: true,
                  name: true,
                  accountNumber: true,
                },
              },
              flaggedByPortalUser: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          portalUsers: {
            select: {
              id: true,
              fullName: true,
              email: true,
            status: true,
            lastLoginAt: true,
          }
        },
        contacts: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            fullName: true,
            role: true,
            phone: true,
            mobile: true,
            email: true,
            notes: true,
            businessCardUrl: true,
            createdAt: true,
          },
        },
        orders: {
          select: {
            id: true,
            total: true,
            orderedAt: true,
            deliveredAt: true,
            status: true,
          },
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            dueDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            salesRep: {
              include: {
                user: {
                  select: { fullName: true }
                }
              }
            }
          },
          orderBy: { assignedAt: 'desc' },
          take: 5,
        }
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const totalRevenue = customer.orders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0
    );

    const openInvoices = customer.invoices.filter(
      inv => inv.status !== 'PAID' && inv.status !== 'VOID'
    );

    const outstandingAmount = openInvoices.reduce(
      (sum, inv) => sum + (Number(inv.total) || 0),
      0
    );

    // Calculate days since last order
    let daysSinceLastOrder = null;
    if (customer.lastOrderDate) {
      const diffTime = Date.now() - customer.lastOrderDate.getTime();
      daysSinceLastOrder = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

      return NextResponse.json({
        customer: {
          ...customer,
          totalRevenue,
          totalOrders: customer.orders.length,
          openInvoicesCount: openInvoices.length,
          outstandingAmount,
          daysSinceLastOrder,
          duplicateFlags: customer.duplicateFlags,
        }
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/customers/[id]
 * Update customer information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { id } = await params;
      const body = (await request.json()) as UpdateCustomerPayload;

      console.log('📝 Update request for customer:', id);
      console.log('📦 Request body:', JSON.stringify(body, null, 2));

      // Fetch existing customer
      const existingCustomer = await db.customer.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      console.log('🔍 Existing customer found:', existingCustomer ? 'Yes' : 'No');

      if (!existingCustomer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      if (Object.prototype.hasOwnProperty.call(body, 'deliveryWindows')) {
        const windowsResult = sanitizeDeliveryWindows(body.deliveryWindows);
        if (!windowsResult.valid) {
          return NextResponse.json(
            { error: windowsResult.error ?? 'Invalid deliveryWindows payload' },
            { status: 400 }
          );
        }
        const sanitized = windowsResult.value ?? [];
        updateData.deliveryWindows = sanitized;
        updateData.defaultDeliveryTimeWindow = sanitized.length
          ? formatDeliveryWindow(sanitized[0])
          : null;
      }

      // Prepare update data
      const updateData: Prisma.CustomerUpdateInput = {};

      for (const field of ALLOWED_CUSTOMER_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(body, field)) {
          continue;
        }

        if (field === 'deliveryWindows') {
          continue;
        }

        const value = body[field];
        if (typeof value === 'undefined') {
          continue;
        }

        if (field === 'featurePrograms' && !Array.isArray(value)) {
          return NextResponse.json(
            { error: 'featurePrograms must be an array' },
            { status: 400 }
          );
        }

        updateData[field] = value as Prisma.CustomerUpdateInput[typeof field];
      }

      console.log('💾 Update data:', JSON.stringify(updateData, null, 2));

      // Update customer
      const customer = await db.customer.update({
        where: { id },
        data: updateData,
        include: {
          salesRep: {
            include: {
              user: {
                select: { fullName: true, email: true }
              }
            }
          },
        },
      });

      console.log('✅ Customer updated successfully');

      if (body.isPermanentlyClosed === true) {
        await db.customerDuplicateFlag.updateMany({
          where: {
            tenantId,
            customerId: id,
            status: 'OPEN',
          },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: context.user.id,
          },
        });
      }

      // Log changes
      console.log('📋 Logging audit trail...');
      await logCustomerUpdate(
        tenantId,
        context.user.id,
        customer.id,
        existingCustomer,
        customer,
        body.updateReason
      );

      console.log('✅ Audit log completed');

      return NextResponse.json({ customer });
    } catch (error: unknown) {
      console.error('❌ Error updating customer:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
      }

      const prismaError = error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
      if (prismaError) {
        console.error('Error code:', prismaError.code);
      } else {
        console.error('Error code: Unknown');
      }

      if (prismaError?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Account number already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      );
    }
  });
}
