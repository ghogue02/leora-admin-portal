import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current week's call plan
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();

    const callPlan = await prisma.callPlan.findFirst({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        week: weekNumber,
        year,
      },
      include: {
        accounts: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                accountNumber: true,
                accountType: true,
                location: true,
                lastOrderDate: true,
              },
            },
          },
        },
      },
    });

    if (!callPlan) {
      return NextResponse.json({ accounts: [] });
    }

    const accounts = callPlan.accounts.map((account) => ({
      id: account.id,
      customerId: account.customerId,
      customerName: account.customer.name,
      accountNumber: account.customer.accountNumber,
      accountType: account.customer.accountType,
      priority: account.priority,
      objective: account.objective,
      lastOrderDate: account.customer.lastOrderDate?.toISOString(),
      location: account.customer.location,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching call plan accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch call plan accounts" },
      { status: 500 }
    );
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
