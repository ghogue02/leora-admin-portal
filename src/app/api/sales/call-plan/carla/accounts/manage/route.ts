import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { parseISO, startOfWeek, endOfWeek } from "date-fns";

/**
 * POST - Add accounts to an existing call plan or create a new one
 */
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const { weekStart, accountIds } = body;

      if (!weekStart || !accountIds || !Array.isArray(accountIds)) {
        return NextResponse.json(
          { error: "weekStart and accountIds are required" },
          { status: 400 }
        );
      }

      if (accountIds.length === 0) {
        return NextResponse.json(
          { error: "At least one account must be selected" },
          { status: 400 }
        );
      }

      const weekStartDate = parseISO(weekStart);
      const weekStartNormalized = startOfWeek(weekStartDate, { weekStartsOn: 1 });
      const weekEndNormalized = endOfWeek(weekStartDate, { weekStartsOn: 1 });

      // Find or create call plan for this week
      let callPlan = await db.callPlan.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
          effectiveAt: {
            gte: weekStartNormalized,
            lte: weekEndNormalized,
          },
        },
        orderBy: {
          effectiveAt: "desc",
        },
        include: {
          accounts: true,
        },
      });

      if (!callPlan) {
        // Create new call plan
        callPlan = await db.callPlan.create({
          data: {
            tenantId,
            userId: session.user.id,
            name: `Week of ${weekStartNormalized.toISOString().split("T")[0]}`,
            effectiveAt: weekStartNormalized,
            status: "ACTIVE",
            targetCount: accountIds.length,
          },
          include: {
            accounts: true,
          },
        });
      }

      // Get existing account IDs
      const existingAccountIds = new Set(callPlan.accounts.map((a) => a.customerId));

      // Filter out accounts already in the plan
      const newAccountIds = accountIds.filter((id: string) => !existingAccountIds.has(id));

      // Add new accounts to call plan
      if (newAccountIds.length > 0) {
        await db.callPlanAccount.createMany({
          data: newAccountIds.map((customerId: string) => ({
            tenantId,
            callPlanId: callPlan.id,
            customerId,
            contactOutcome: "NOT_ATTEMPTED" as const,
          })),
          skipDuplicates: true,
        });
      }

      // Update target count
      const totalAccounts = existingAccountIds.size + newAccountIds.length;
      await db.callPlan.update({
        where: { id: callPlan.id },
        data: { targetCount: totalAccounts },
      });

      return NextResponse.json({
        success: true,
        callPlan: {
          id: callPlan.id,
          name: callPlan.name,
          weekStart: weekStartNormalized.toISOString(),
          totalAccounts,
          newAccountsAdded: newAccountIds.length,
          existingAccounts: existingAccountIds.size,
        },
      });
    } catch (error) {
      console.error("Error managing call plan accounts:", error);
      return NextResponse.json(
        { error: "Failed to update call plan" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE - Remove accounts from call plan
 */
export async function DELETE(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const { weekStart, accountIds } = body;

      if (!weekStart || !accountIds || !Array.isArray(accountIds)) {
        return NextResponse.json(
          { error: "weekStart and accountIds are required" },
          { status: 400 }
        );
      }

      const weekStartDate = parseISO(weekStart);
      const weekStartNormalized = startOfWeek(weekStartDate, { weekStartsOn: 1 });
      const weekEndNormalized = endOfWeek(weekStartDate, { weekStartsOn: 1 });

      // Find call plan for this week
      const callPlan = await db.callPlan.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
          effectiveAt: {
            gte: weekStartNormalized,
            lte: weekEndNormalized,
          },
        },
        orderBy: {
          effectiveAt: "desc",
        },
      });

      if (!callPlan) {
        return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
      }

      // Remove accounts from call plan
      const deleted = await db.callPlanAccount.deleteMany({
        where: {
          callPlanId: callPlan.id,
          customerId: { in: accountIds },
        },
      });

      // Update target count
      const remainingCount = await db.callPlanAccount.count({
        where: { callPlanId: callPlan.id },
      });

      await db.callPlan.update({
        where: { id: callPlan.id },
        data: { targetCount: remainingCount },
      });

      return NextResponse.json({
        success: true,
        accountsRemoved: deleted.count,
        remainingAccounts: remainingCount,
      });
    } catch (error) {
      console.error("Error removing accounts from call plan:", error);
      return NextResponse.json(
        { error: "Failed to remove accounts" },
        { status: 500 }
      );
    }
  });
}

/**
 * GET - Get selected accounts for a week
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const { searchParams } = request.nextUrl;
      const weekStartParam = searchParams.get("weekStart");

      if (!weekStartParam) {
        return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
      }

      const weekStartDate = parseISO(weekStartParam);
      const weekStartNormalized = startOfWeek(weekStartDate, { weekStartsOn: 1 });
      const weekEndNormalized = endOfWeek(weekStartDate, { weekStartsOn: 1 });

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

      const [assignmentCustomers, directCustomers] = await Promise.all([
        db.customerAssignment.findMany({
          where: {
            tenantId,
            salesRepId: salesRep.id,
            unassignedAt: null,
          },
          select: {
            customerId: true,
          },
        }),
        db.customer.findMany({
          where: {
            tenantId,
            salesRepId: salesRep.id,
            isPermanentlyClosed: false,
          },
          select: {
            id: true,
          },
        }),
      ]);

      const customerIdsSet = new Set<string>();
      assignmentCustomers.forEach((assignment) => customerIdsSet.add(assignment.customerId));
      directCustomers.forEach((customer) => customerIdsSet.add(customer.id));

      if (customerIdsSet.size === 0) {
        return NextResponse.json({
          selectedAccountIds: [],
          accounts: [],
          callPlan: null,
        });
      }

      const repCustomers = await db.customer.findMany({
        where: {
          tenantId,
          id: {
            in: Array.from(customerIdsSet),
          },
          isPermanentlyClosed: false,
        },
        select: {
          id: true,
        },
      });

      const callPlanAccountInclude = {
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            city: true,
            state: true,
            lastOrderDate: true,
            riskStatus: true,
            territory: true,
          },
        },
      } as const;

      let callPlan = await db.callPlan.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
          effectiveAt: {
            gte: weekStartNormalized,
            lte: weekEndNormalized,
          },
        },
        orderBy: {
          effectiveAt: "desc",
        },
        include: {
          accounts: {
            include: callPlanAccountInclude,
          },
        },
      });

      if (!callPlan) {
        callPlan = await db.callPlan.create({
          data: {
            tenantId,
            userId: session.user.id,
            name: `Week of ${weekStartNormalized.toISOString().split("T")[0]}`,
            effectiveAt: weekStartNormalized,
            status: "ACTIVE",
            targetCount: repCustomers.length,
          },
          include: {
            accounts: {
              include: callPlanAccountInclude,
            },
          },
        });
      }

      const existingAccountIds = new Set(callPlan.accounts.map((account) => account.customerId));
      const missingCustomers = repCustomers.filter(
        (customer) => !existingAccountIds.has(customer.id)
      );

      if (missingCustomers.length > 0) {
        await db.callPlanAccount.createMany({
          data: missingCustomers.map((customer) => ({
            tenantId,
            callPlanId: callPlan!.id,
            customerId: customer.id,
            contactOutcome: "NOT_ATTEMPTED",
          })),
          skipDuplicates: true,
        });

        callPlan = await db.callPlan.findFirst({
          where: {
            tenantId,
            id: callPlan.id,
          },
          include: {
            accounts: {
              include: callPlanAccountInclude,
            },
          },
        });

        await db.callPlan.update({
          where: { id: callPlan!.id },
          data: { targetCount: repCustomers.length },
        });
      }

      if (!callPlan) {
        return NextResponse.json(
          { error: "Failed to load call plan" },
          { status: 500 }
        );
      }

      const selectedAccountIds = callPlan.accounts.map((a) => a.customerId);
      const accountsWithStatus = callPlan.accounts.map((account) => ({
        id: account.customerId,
        name: account.customer.name,
        accountNumber: account.customer.accountNumber,
        city: account.customer.city,
        state: account.customer.state,
        lastOrderDate: account.customer.lastOrderDate?.toISOString(),
        contactOutcome: account.contactOutcome,
        contactedAt: account.contactedAt?.toISOString(),
        objective: account.objective,
        notes: account.notes,
        territory: account.customer.territory,
      }));

      return NextResponse.json({
        selectedAccountIds,
        accounts: accountsWithStatus,
        callPlan: {
          id: callPlan.id,
          name: callPlan.name,
          status: callPlan.status,
          targetCount: callPlan.targetCount,
        },
      });
    } catch (error) {
      console.error("Error fetching selected accounts:", error);
      return NextResponse.json(
        { error: "Failed to fetch selected accounts" },
        { status: 500 }
      );
    }
  });
}
