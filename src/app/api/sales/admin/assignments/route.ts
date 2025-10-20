import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Fetch all customers with their sales rep assignments
      const customers = await db.customer.findMany({
        where: {
          tenantId,
          isPermanentlyClosed: false,
        },
        select: {
          id: true,
          name: true,
          accountNumber: true,
          city: true,
          state: true,
          salesRepId: true,
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json({
        customers,
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const body = await request.json();
      const { customerId, salesRepId } = body;

      if (!customerId || !salesRepId) {
        return NextResponse.json(
          { error: "Customer ID and Sales Rep ID are required" },
          { status: 400 }
        );
      }

      // Verify the sales rep exists and belongs to this tenant
      const salesRep = await db.salesRep.findUnique({
        where: {
          id: salesRepId,
          tenantId,
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales representative not found" },
          { status: 404 }
        );
      }

      // Verify the customer exists and belongs to this tenant
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      // Update the customer's sales rep assignment
      const updatedCustomer = await db.customer.update({
        where: {
          id: customerId,
        },
        data: {
          salesRepId,
        },
        include: {
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      // Create an assignment record for audit trail
      await db.customerAssignment.create({
        data: {
          tenantId,
          salesRepId,
          customerId,
          assignedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        customer: {
          id: updatedCustomer.id,
          name: updatedCustomer.name,
          salesRep: updatedCustomer.salesRepProfile,
        },
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}

export async function PUT(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const body = await request.json();
      const { customerId, salesRepId } = body;

      if (!customerId) {
        return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
      }

      // If salesRepId is null, we're unassigning the customer
      if (salesRepId === null) {
        const updatedCustomer = await db.customer.update({
          where: {
            id: customerId,
            tenantId,
          },
          data: {
            salesRepId: null,
          },
        });

        // Mark the current assignment as unassigned
        await db.customerAssignment.updateMany({
          where: {
            tenantId,
            customerId,
            unassignedAt: null,
          },
          data: {
            unassignedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          customer: {
            id: updatedCustomer.id,
            name: updatedCustomer.name,
            salesRep: null,
          },
        });
      }

      // Otherwise, use the same logic as POST
      return POST(request);
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
