import type { Prisma, PrismaClient, TriggerType, TaskPriority } from "@prisma/client";
import { createAuditLog } from "./audit-log";

/**
 * Trigger configuration interface
 */
export interface TriggerConfig {
  daysAfter?: number;
  activityType?: string;
  priority?: TaskPriority;
  taskTitle?: string;
  taskDescription?: string;
  percentageThreshold?: number; // For burn rate calculations
}

/**
 * Process result interface
 */
export interface ProcessResult {
  triggerId: string;
  triggerType: TriggerType;
  tasksCreated: number;
  errors: string[];
}

/**
 * Main trigger processing function - processes all active triggers
 */
export async function processTriggers(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  // Get all active triggers for the tenant
  const triggers = await db.automatedTrigger.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: {
      triggerType: "asc",
    },
  });

  // Process each trigger
  for (const trigger of triggers) {
    let tasksCreated = 0;
    const errors: string[] = [];

    try {
      switch (trigger.triggerType) {
        case "SAMPLE_NO_ORDER":
          tasksCreated = await processSampleNoOrderTrigger(db, trigger);
          break;
        case "FIRST_ORDER_FOLLOWUP":
          tasksCreated = await processFirstOrderFollowup(db, trigger);
          break;
        case "CUSTOMER_TIMING":
          tasksCreated = await processCustomerTimingTrigger(db, trigger);
          break;
        case "BURN_RATE_ALERT":
          tasksCreated = await processBurnRateAlert(db, trigger);
          break;
        default:
          errors.push(`Unknown trigger type: ${trigger.triggerType}`);
      }
    } catch (error) {
      errors.push(
        `Error processing trigger ${trigger.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    results.push({
      triggerId: trigger.id,
      triggerType: trigger.triggerType,
      tasksCreated,
      errors,
    });
  }

  return results;
}

/**
 * Process SAMPLE_NO_ORDER trigger
 * Creates tasks for samples that haven't resulted in orders after X days
 */
export async function processSampleNoOrderTrigger(
  db: PrismaClient | Prisma.TransactionClient,
  trigger: any,
): Promise<number> {
  const config = trigger.config as TriggerConfig;
  const daysAfter = config.daysAfter || 7;

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAfter);

  // Find samples that need follow-up
  const samples = await db.sampleUsage.findMany({
    where: {
      tenantId: trigger.tenantId,
      tastedAt: {
        lte: cutoffDate,
      },
      followedUpAt: null,
      resultedInOrder: false,
    },
    include: {
      customer: {
        include: {
          salesRep: {
            include: {
              user: true,
            },
          },
        },
      },
      sku: {
        include: {
          product: true,
        },
      },
    },
  });

  let tasksCreated = 0;

  for (const sample of samples) {
    // Check if task already exists for this sample
    const existingTriggeredTask = await db.triggeredTask.findFirst({
      where: {
        tenantId: trigger.tenantId,
        triggerId: trigger.id,
        customerId: sample.customerId,
        triggeredAt: {
          gte: sample.tastedAt,
        },
      },
    });

    if (existingTriggeredTask) {
      continue; // Skip if already triggered
    }

    // Create task
    const task = await createTriggeredTask(db, trigger, sample.customerId, {
      title:
        config.taskTitle ||
        `Follow up on ${sample.sku.product.name} sample tasting`,
      description:
        config.taskDescription ||
        `Customer tasted ${sample.sku.product.name} on ${sample.tastedAt.toISOString().split("T")[0]} but hasn't placed an order yet. Follow up to see if they're interested in ordering.${sample.feedback ? `\n\nFeedback: ${sample.feedback}` : ""}`,
      userId: sample.customer.salesRepId
        ? sample.customer.salesRep?.userId
        : undefined,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    });

    tasksCreated++;

    // Mark sample as followed up
    await db.sampleUsage.update({
      where: { id: sample.id },
      data: { followedUpAt: new Date() },
    });
  }

  return tasksCreated;
}

/**
 * Process FIRST_ORDER_FOLLOWUP trigger
 * Creates thank you tasks after first orders
 */
export async function processFirstOrderFollowup(
  db: PrismaClient | Prisma.TransactionClient,
  trigger: any,
): Promise<number> {
  const config = trigger.config as TriggerConfig;
  const daysAfter = config.daysAfter || 1;

  // Calculate date range
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - daysAfter);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 1); // Process last 24 hours

  // Find first orders delivered in the timeframe
  const orders = await db.order.findMany({
    where: {
      tenantId: trigger.tenantId,
      isFirstOrder: true,
      deliveredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      customer: {
        include: {
          salesRep: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  let tasksCreated = 0;

  for (const order of orders) {
    // Check if task already exists
    const existingTriggeredTask = await db.triggeredTask.findFirst({
      where: {
        tenantId: trigger.tenantId,
        triggerId: trigger.id,
        customerId: order.customerId,
      },
    });

    if (existingTriggeredTask) {
      continue;
    }

    // Create thank you task
    const task = await createTriggeredTask(db, trigger, order.customerId, {
      title: config.taskTitle || `Thank you call for ${order.customer.name}`,
      description:
        config.taskDescription ||
        `First order delivered on ${order.deliveredAt?.toISOString().split("T")[0]}. Call to thank them and ensure satisfaction.`,
      userId: order.customer.salesRepId
        ? order.customer.salesRep?.userId
        : undefined,
      dueAt: new Date(), // Due today
    });

    tasksCreated++;
  }

  return tasksCreated;
}

/**
 * Process CUSTOMER_TIMING trigger
 * Creates tasks when doNotContactUntil date passes
 */
export async function processCustomerTimingTrigger(
  db: PrismaClient | Prisma.TransactionClient,
  trigger: any,
): Promise<number> {
  const config = trigger.config as TriggerConfig;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find customers whose doNotContactUntil date has passed
  const customers = await db.customer.findMany({
    where: {
      tenantId: trigger.tenantId,
      doNotContactUntil: {
        lte: today,
      },
    },
    include: {
      salesRep: {
        include: {
          user: true,
        },
      },
    },
  });

  let tasksCreated = 0;

  for (const customer of customers) {
    // Check if task already exists
    const existingTriggeredTask = await db.triggeredTask.findFirst({
      where: {
        tenantId: trigger.tenantId,
        triggerId: trigger.id,
        customerId: customer.id,
      },
    });

    if (existingTriggeredTask) {
      continue;
    }

    // Create contact task
    const task = await createTriggeredTask(db, trigger, customer.id, {
      title: config.taskTitle || `Contact ${customer.name}`,
      description:
        config.taskDescription ||
        `Customer requested not to be contacted until ${customer.doNotContactUntil?.toISOString().split("T")[0]}. That date has passed - reach out now.`,
      userId: customer.salesRepId ? customer.salesRep?.userId : undefined,
      dueAt: new Date(), // Due today
    });

    tasksCreated++;

    // Clear the doNotContactUntil date
    await db.customer.update({
      where: { id: customer.id },
      data: { doNotContactUntil: null },
    });
  }

  return tasksCreated;
}

/**
 * Process BURN_RATE_ALERT trigger
 * Creates tasks when customers are likely due for reorder
 */
export async function processBurnRateAlert(
  db: PrismaClient | Prisma.TransactionClient,
  trigger: any,
): Promise<number> {
  const config = trigger.config as TriggerConfig;
  const thresholdPercentage = config.percentageThreshold || 20; // 20% past expected date
  const today = new Date();

  // Find customers with ordering patterns
  const customers = await db.customer.findMany({
    where: {
      tenantId: trigger.tenantId,
      averageOrderIntervalDays: {
        not: null,
      },
      lastOrderDate: {
        not: null,
      },
      nextExpectedOrderDate: {
        not: null,
      },
    },
    include: {
      salesRep: {
        include: {
          user: true,
        },
      },
    },
  });

  let tasksCreated = 0;

  for (const customer of customers) {
    if (!customer.nextExpectedOrderDate || !customer.averageOrderIntervalDays) {
      continue;
    }

    // Calculate grace period
    const graceDays = Math.floor(
      (customer.averageOrderIntervalDays * thresholdPercentage) / 100,
    );
    const alertDate = new Date(customer.nextExpectedOrderDate);
    alertDate.setDate(alertDate.getDate() + graceDays);

    // Check if we're past the alert date
    if (today < alertDate) {
      continue;
    }

    // Check if task already exists (within last 30 days)
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    const existingTriggeredTask = await db.triggeredTask.findFirst({
      where: {
        tenantId: trigger.tenantId,
        triggerId: trigger.id,
        customerId: customer.id,
        triggeredAt: {
          gte: recentCutoff,
        },
      },
    });

    if (existingTriggeredTask) {
      continue;
    }

    // Create reorder reminder task
    const task = await createTriggeredTask(db, trigger, customer.id, {
      title:
        config.taskTitle || `Reorder check-in for ${customer.name}`,
      description:
        config.taskDescription ||
        `Customer typically orders every ${customer.averageOrderIntervalDays} days. Last order was on ${customer.lastOrderDate?.toISOString().split("T")[0]}. They're likely due for a reorder - check in to see if they need anything.`,
      userId: customer.salesRepId ? customer.salesRep?.userId : undefined,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    });

    tasksCreated++;
  }

  return tasksCreated;
}

/**
 * Create a triggered task and link it to the trigger
 */
export async function createTriggeredTask(
  db: PrismaClient | Prisma.TransactionClient,
  trigger: any,
  customerId: string,
  taskData: {
    title: string;
    description?: string;
    userId?: string;
    dueAt?: Date;
  },
): Promise<any> {
  const config = trigger.config as TriggerConfig;

  // Create the task
  const task = await db.task.create({
    data: {
      tenantId: trigger.tenantId,
      customerId,
      userId: taskData.userId,
      title: taskData.title,
      description: taskData.description,
      priority: config.priority || "MEDIUM",
      dueAt: taskData.dueAt,
      status: "PENDING",
    },
  });

  // Create the triggered task link
  await db.triggeredTask.create({
    data: {
      tenantId: trigger.tenantId,
      triggerId: trigger.id,
      taskId: task.id,
      customerId,
    },
  });

  // Audit log
  await createAuditLog(db, {
    tenantId: trigger.tenantId,
    entityType: "Task",
    entityId: task.id,
    action: "CREATE",
    metadata: {
      source: "automated_trigger",
      triggerId: trigger.id,
      triggerType: trigger.triggerType,
    },
  });

  return task;
}

/**
 * Get trigger statistics
 */
export async function getTriggerStatistics(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  triggerId: string,
): Promise<{
  totalTasksCreated: number;
  tasksCompleted: number;
  tasksPending: number;
  completionRate: number;
}> {
  const triggeredTasks = await db.triggeredTask.findMany({
    where: {
      tenantId,
      triggerId,
    },
    include: {
      task: true,
    },
  });

  const totalTasksCreated = triggeredTasks.length;
  const tasksCompleted = triggeredTasks.filter(
    (tt) => tt.task.status === "COMPLETED",
  ).length;
  const tasksPending = triggeredTasks.filter(
    (tt) => tt.task.status === "PENDING" || tt.task.status === "IN_PROGRESS",
  ).length;
  const completionRate =
    totalTasksCreated > 0 ? (tasksCompleted / totalTasksCreated) * 100 : 0;

  return {
    totalTasksCreated,
    tasksCompleted,
    tasksPending,
    completionRate,
  };
}
