import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskPriority, TaskStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { customerId } = await context.params;

    let body: {
      title?: string;
      description?: string | null;
      dueAt?: string | null;
      priority?: TaskPriority | null;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = body.title?.trim();
    const description = body.description?.trim() || null;

    const priorityValue = body.priority ? String(body.priority).toUpperCase() : null;
    const allowedPriorities = Object.values(TaskPriority);
    const priority: TaskPriority = priorityValue && allowedPriorities.includes(priorityValue as TaskPriority)
      ? (priorityValue as TaskPriority)
      : TaskPriority.MEDIUM;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    let dueDate: Date | null = null;
    if (body.dueAt) {
      const parsed = new Date(body.dueAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid due date" },
          { status: 400 }
        );
      }
      dueDate = parsed;
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

    const task = await db.task.create({
      data: {
        tenantId,
        userId: session.user.id,
        customerId,
        title,
        description,
        dueAt: dueDate,
        status: TaskStatus.PENDING,
        priority,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      task: {
        ...task,
        dueAt: task.dueAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      },
    });
  });
}
