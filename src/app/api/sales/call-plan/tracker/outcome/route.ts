import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek } from "date-fns";
import { composeTaskDescription, parseTaskMetadata } from "@/lib/call-plan/task-metadata";

/**
 * POST /api/sales/call-plan/tracker/outcome
 * Update contact outcome (contact method) for an account
 */
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { accountId, weekStart, outcome, notes, markedAt } = body;

    if (!accountId || !weekStart) {
      return NextResponse.json(
        { error: "accountId and weekStart are required" },
        { status: 400 }
      );
    }

    const weekStartDate = new Date(weekStart);
    const weekStartBound = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEndBound = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    // Find the task for this account in this week
    const task = await db.task.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        customerId: accountId,
        dueAt: {
          gte: weekStartBound,
          lte: weekEndBound,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "No task found for this account in the specified week" },
        { status: 404 }
      );
    }

    const metadata = parseTaskMetadata(task.description);
    const resolvedNotes =
      typeof notes === "string"
        ? notes
        : metadata.notes;
    const outcomeValue =
      typeof outcome === "string" && outcome.length > 0 ? outcome.toLowerCase() : null;
    const outcomeTimestamp = outcomeValue
      ? markedAt
        ? new Date(markedAt).toISOString()
        : new Date().toISOString()
      : null;

    const newDescription = composeTaskDescription({
      activityTypeId: metadata.activityTypeId,
      outcomeType: outcomeValue || undefined,
      outcomeTimestamp: outcomeTimestamp || undefined,
      notes: resolvedNotes,
    });

    // Update the task
    const updatedTask = await db.task.update({
      where: { id: task.id },
      data: {
        description: newDescription,
        // Any recorded contact method marks the task complete
        status: outcomeValue ? "COMPLETED" : "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  });
}
