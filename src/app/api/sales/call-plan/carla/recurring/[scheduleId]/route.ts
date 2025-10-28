import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { scheduleId } = params;

    const recurring = await db.recurringCallPlan.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
    });

    if (!recurring) {
      return NextResponse.json(
        { error: "Recurring schedule not found" },
        { status: 404 },
      );
    }

    await db.recurringCallPlan.update({
      where: { id: scheduleId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  });
}
