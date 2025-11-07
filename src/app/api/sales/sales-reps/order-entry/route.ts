import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const reps = await db.salesRep.findMany({
      where: {
        tenantId,
        isActive: true,
        orderEntryEnabled: true,
      },
      select: {
        id: true,
        territoryName: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    const sorted = reps
      .map((rep) => ({
        id: rep.id,
        name: rep.user.fullName,
        territory: rep.territoryName,
        email: rep.user.email,
      }))
      .sort((a, b) => {
        const firstA = a.name.split(/\s+/)[0]?.toLowerCase() ?? a.name.toLowerCase();
        const firstB = b.name.split(/\s+/)[0]?.toLowerCase() ?? b.name.toLowerCase();
        if (firstA === firstB) {
          return a.name.localeCompare(b.name);
        }
        return firstA.localeCompare(firstB);
      });

    return NextResponse.json({ salesReps: sorted });
  });
}
