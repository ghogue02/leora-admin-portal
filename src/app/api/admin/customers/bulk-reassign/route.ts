import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logCustomerReassignment } from '@/lib/audit';

/**
 * POST /api/admin/customers/bulk-reassign
 * Bulk reassign multiple customers to a new sales rep
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = await request.json();
      const { customerIds, newSalesRepId, reason } = body;

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return NextResponse.json(
          { error: 'customerIds array is required' },
          { status: 400 }
        );
      }

      if (!newSalesRepId) {
        return NextResponse.json(
          { error: 'newSalesRepId is required' },
          { status: 400 }
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

      // Fetch customers
      const customers = await db.customer.findMany({
        where: {
          id: { in: customerIds },
          tenantId,
        },
      });

      if (customers.length === 0) {
        return NextResponse.json(
          { error: 'No customers found' },
          { status: 404 }
        );
      }

      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      // Process each customer
      for (const customer of customers) {
        try {
          const oldSalesRepId = customer.salesRepId;

          // Mark old assignment as unassigned
          if (oldSalesRepId) {
            await db.customerAssignment.updateMany({
              where: {
                tenantId,
                customerId: customer.id,
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
              customerId: customer.id,
              salesRepId: newSalesRepId,
            },
          });

          // Update customer
          await db.customer.update({
            where: { id: customer.id },
            data: { salesRepId: newSalesRepId },
          });

          // Log reassignment
          await logCustomerReassignment(
            tenantId,
            context.user.id,
            customer.id,
            oldSalesRepId,
            newSalesRepId,
            reason
          );

          results.successful.push(customer.id);
        } catch (error: any) {
          results.failed.push({
            id: customer.id,
            error: error.message || 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        message: `Bulk reassignment completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
        results,
      });
    } catch (error) {
      console.error('Error in bulk reassignment:', error);
      return NextResponse.json(
        { error: 'Failed to perform bulk reassignment' },
        { status: 500 }
      );
    }
  });
}
