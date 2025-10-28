import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { generateTerritorySuggestions } from "@/lib/call-plan/territory-optimizer";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const callPlanId = request.nextUrl.searchParams.get("callPlanId");

    if (!callPlanId) {
      return NextResponse.json({ error: "callPlanId is required" }, { status: 400 });
    }

    const callPlan = await db.callPlan.findFirst({
      where: {
        id: callPlanId,
        tenantId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    const [accounts, territoryBlocks] = await Promise.all([
      db.callPlanAccount.findMany({
        where: {
          callPlanId,
          tenantId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              territory: true,
              latitude: true,
              longitude: true,
              city: true,
              state: true,
              lastOrderDate: true,
            },
          },
        },
      }),
      db.territoryBlock.findMany({
        where: {
          tenantId,
          callPlanId,
        },
      }),
    ]);

    const suggestions = generateTerritorySuggestions({
      accounts: accounts.map((account) => ({
        id: account.id,
        customerId: account.customerId,
        customerName: account.customer.name,
        territory: account.customer.territory,
        latitude: account.customer.latitude,
        longitude: account.customer.longitude,
        city: account.customer.city,
        state: account.customer.state,
        lastOrderDate: account.customer.lastOrderDate,
      })),
      blocks: territoryBlocks.map((block) => ({
        id: block.id,
        territory: block.territory,
        dayOfWeek: block.dayOfWeek,
        allDay: block.allDay,
        startTime: block.startTime ?? null,
        endTime: block.endTime ?? null,
      })),
    });

    return NextResponse.json({ suggestions });
  });
}
