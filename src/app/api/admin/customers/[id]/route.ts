import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logCustomerUpdate } from '@/lib/audit';

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
      const body = await request.json();

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

      // Prepare update data
      const updateData: any = {};
      const allowedFields = [
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
        'salesRepId',
        'isPermanentlyClosed',
        'closedReason',
      ];

      for (const field of allowedFields) {
        if (field in body) {
          updateData[field] = body[field];
        }
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
    } catch (error: any) {
      console.error('❌ Error updating customer:', error);
      console.error('Error stack:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      if (error.code === 'P2002') {
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
