import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { logTerritoryChange } from "@/lib/audit/log";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { id: repId } = await params;

      // Verify rep exists and belongs to tenant
      const existingRep = await db.salesRep.findUnique({
        where: {
          id: repId,
          tenantId,
        },
        include: {
          user: true,
          customers: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingRep) {
        return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
      }

      const body = await request.json();
      const { newTerritoryName, reassignCustomers } = body;

      if (!newTerritoryName) {
        return NextResponse.json(
          { error: "newTerritoryName is required" },
          { status: 400 }
        );
      }

      const oldTerritory = existingRep.territoryName;

      try {
        // Use a transaction to ensure all changes happen together
        await db.$transaction(async tx => {
          // Update the sales rep's territory
          await tx.salesRep.update({
            where: { id: repId },
            data: { territoryName: newTerritoryName },
          });

          // If reassignCustomers is true, update all assigned customers
          if (reassignCustomers && existingRep.customers.length > 0) {
            // Note: In the current schema, customers don't have a territoryName field
            // They are linked to territory via their salesRepId
            // So this is handled automatically by the customer-salesRep relationship

            // If you want to track territory changes, you could create CustomerAssignment records
            const customerIds = existingRep.customers.map(c => c.id);

            // Create assignment history records
            await tx.customerAssignment.createMany({
              data: customerIds.map(customerId => ({
                tenantId,
                salesRepId: repId,
                customerId,
                assignedAt: new Date(),
              })),
            });
          }
        });

        // Log the change to AuditLog
        await logTerritoryChange(db, {
          tenantId,
          userId: session.user.id,
          salesRepId: repId,
          oldTerritory,
          newTerritory: newTerritoryName,
          customersReassigned: reassignCustomers || false,
          metadata: {
            salesRepName: existingRep.user.fullName,
            customerCount: existingRep.customers.length,
            updatedBy: session.user.email,
            updatedByName: session.user.fullName,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Territory updated successfully",
          changes: {
            oldTerritory,
            newTerritory: newTerritoryName,
            customersAffected: reassignCustomers ? existingRep.customers.length : 0,
          },
        });
      } catch (error) {
        console.error("Failed to update territory:", error);
        return NextResponse.json(
          { error: "Failed to update territory" },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
