import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { categorizeCustomersSchema } from "@/types/call-plan";
import { AccountType, TaskPriority } from "@prisma/client";

/**
 * PATCH /api/customers/categorize
 * Bulk update customer account types and priorities
 *
 * This endpoint allows sales reps to categorize multiple customers at once,
 * updating their account types (ACTIVE, TARGET, PROSPECT) and optionally
 * creating high-priority tasks for follow-up.
 */
export async function PATCH(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const input = categorizeCustomersSchema.parse(body);

      // Get sales rep profile
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      // Verify all customers belong to this sales rep
      const customers = await db.customer.findMany({
        where: {
          id: { in: input.customerIds },
          tenantId,
          salesRepId: salesRep.id,
        },
        select: {
          id: true,
          name: true,
          accountType: true,
        },
      });

      if (customers.length !== input.customerIds.length) {
        return NextResponse.json(
          { error: "Some customers not found or not assigned to you" },
          { status: 404 }
        );
      }

      // Track updates
      const updates: {
        customerId: string;
        customerName: string;
        previousAccountType: AccountType | null;
        newAccountType: AccountType | null;
        taskCreated: boolean;
      }[] = [];

      // Update customers in a transaction
      await db.$transaction(async (tx) => {
        for (const customer of customers) {
          const previousAccountType = customer.accountType;

          // Update account type if provided
          if (input.accountType) {
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                accountType: input.accountType as AccountType,
              },
            });
          }

          // Create task if priority is provided and is HIGH
          let taskCreated = false;
          if (input.priority === "HIGH") {
            // Check if there's already a pending high-priority task for this customer
            const existingTask = await tx.task.findFirst({
              where: {
                customerId: customer.id,
                userId: session.user.id,
                tenantId,
                priority: "HIGH",
                status: "PENDING",
              },
            });

            if (!existingTask) {
              await tx.task.create({
                data: {
                  tenantId,
                  customerId: customer.id,
                  userId: session.user.id,
                  assignedById: session.user.id,
                  title: `High Priority: Contact ${customer.name}`,
                  description: `Follow up with ${customer.name} - categorized as ${input.accountType || "priority customer"}`,
                  priority: input.priority as TaskPriority,
                  status: "PENDING",
                  dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                },
              });
              taskCreated = true;
            }
          }

          updates.push({
            customerId: customer.id,
            customerName: customer.name,
            previousAccountType,
            newAccountType: input.accountType as AccountType | null,
            taskCreated,
          });
        }
      });

      return NextResponse.json({
        success: true,
        updatedCount: updates.length,
        updates,
        summary: {
          accountTypeChanged: updates.filter((u) => u.newAccountType !== null).length,
          tasksCreated: updates.filter((u) => u.taskCreated).length,
        },
      });
    } catch (error) {
      console.error("[PATCH /api/customers/categorize] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid request body", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to categorize customers" },
        { status: 500 }
      );
    }
  });
}
