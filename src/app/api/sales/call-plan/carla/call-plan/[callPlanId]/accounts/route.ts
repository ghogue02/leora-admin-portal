import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { callPlanId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { callPlanId } = params;

    const body = await request.json().catch(() => null);
    const customerId = body?.customerId;

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const callPlan = await db.callPlan.findFirst({
      where: {
        id: callPlanId,
        tenantId,
        userId: session.user.id,
      },
      include: {
        accounts: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        isPermanentlyClosed: false,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const alreadyExists = callPlan.accounts.some(
      (account) => account.customerId === customerId,
    );

    if (alreadyExists) {
      return NextResponse.json({ success: true, message: "Account already added" });
    }

    try {
      await db.callPlanAccount.create({
        data: {
          tenantId,
          callPlanId,
          customerId,
          contactOutcome: "NOT_ATTEMPTED",
        },
      });

      const totalAccounts = await db.callPlanAccount.count({
        where: { callPlanId },
      });

      await db.callPlan.update({
        where: { id: callPlanId },
        data: {
          targetCount: totalAccounts,
        },
      });

      return NextResponse.json({
        success: true,
        totalAccounts,
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({
          success: true,
          message: "Account already added",
        });
      }

      console.error("[CARLA][callPlan:addAccount] error", error);
      return NextResponse.json(
        { error: "Failed to add account to call plan" },
        { status: 500 },
      );
    }
  });
}
