import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskStatus } from "@prisma/client";
import { startOfWeek, endOfWeek } from "date-fns";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { customerId, activityTypeId, dueAt, title, description } = body;

    if (!customerId || !dueAt || !title) {
      return NextResponse.json(
        { error: "customerId, dueAt, and title are required" },
        { status: 400 }
      );
    }

    // Verify customer belongs to this sales rep
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        salesRep: {
          userId: session.user.id,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or not assigned to you" },
        { status: 404 }
      );
    }

    // Get or create call plan for this week
    const dueDate = new Date(dueAt);
    const weekStart = startOfWeek(dueDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dueDate, { weekStartsOn: 1 });

    let callPlan = await db.callPlan.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        effectiveAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // Create call plan if it doesn't exist
    if (!callPlan) {
      const weekLabel = `Week of ${weekStart.toLocaleDateString()}`;
      callPlan = await db.callPlan.create({
        data: {
          tenantId,
          userId: session.user.id,
          name: weekLabel,
          effectiveAt: weekStart,
        },
      });
    }

    // Create the task
    const task = await db.task.create({
      data: {
        tenantId,
        userId: session.user.id,
        callPlanId: callPlan.id,
        customerId,
        title,
        description,
        dueAt: dueDate,
        status: TaskStatus.PENDING,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Store activityTypeId in description if provided (temporary solution)
    // In a production app, you'd add an activityTypeId field to Task model
    if (activityTypeId && task.description) {
      await db.task.update({
        where: { id: task.id },
        data: {
          description: `[activityType:${activityTypeId}] ${task.description}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      task,
    });
  });
}
