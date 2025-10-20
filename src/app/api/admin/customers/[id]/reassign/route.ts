import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logCustomerReassignment } from '@/lib/audit';

/**
 * POST /api/admin/customers/[id]/reassign
 * Reassign customer to a different sales rep
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { id } = await params;
      const body = await request.json();
      const { newSalesRepId, reason } = body;

      if (!newSalesRepId) {
        return NextResponse.json(
          { error: 'newSalesRepId is required' },
          { status: 400 }
        );
      }

      // Fetch existing customer
      const customer = await db.customer.findFirst({
        where: { id, tenantId },
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Verify new sales rep exists
      const salesRep = await db.salesRep.findFirst({
        where: { id: newSalesRepId, tenantId },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep not found' },
          { status: 404 }
        );
      }

      const oldSalesRepId = customer.salesRepId;

      // Mark old assignment as unassigned
      if (oldSalesRepId) {
        await db.customerAssignment.updateMany({
          where: {
            tenantId,
            customerId: id,
            salesRepId: oldSalesRepId,
            unassignedAt: null,
          },
          data: {
            unassignedAt: new Date(),
          },
        });
      }

      // Create new assignment
      await db.customerAssignment.create({
        data: {
          tenantId,
          customerId: id,
          salesRepId: newSalesRepId,
        },
      });

      // Update customer
      const updatedCustomer = await db.customer.update({
        where: { id },
        data: { salesRepId: newSalesRepId },
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

      // Log reassignment
      await logCustomerReassignment(
        tenantId,
        context.user.id,
        id,
        oldSalesRepId,
        newSalesRepId,
        reason
      );

      return NextResponse.json({
        customer: updatedCustomer,
        message: 'Customer reassigned successfully',
      });
    } catch (error) {
      console.error('Error reassigning customer:', error);
      return NextResponse.json(
        { error: 'Failed to reassign customer' },
        { status: 500 }
      );
    }
  });
}
