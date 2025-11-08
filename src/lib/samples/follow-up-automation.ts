import { Prisma, PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";

export type FollowUpAutomationOptions = {
  tenantId?: string;
  lookbackDays?: number;
  limitPerTenant?: number;
};

export type FollowUpAutomationResult = {
  tenantsProcessed: number;
  samplesScanned: number;
  tasksCreated: number;
  skippedMissingOwner: number;
};

export type FollowUpAutomationStatus = {
  pendingFollowUps: number;
  withoutTask: number;
  overdueWithoutTask: number;
  lastTaskCreatedAt: string | null;
};

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export async function createFollowUpTaskForSampleUsage(
  db: PrismaExecutor,
  sampleUsageId: string,
) {
  const sample = await db.sampleUsage.findUnique({
    where: { id: sampleUsageId },
    include: {
      sku: {
        select: {
          code: true,
          product: {
            select: {
              name: true,
              brand: true,
            },
          },
        },
      },
      salesRep: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!sample) {
    return { created: false, reason: "sample_not_found" } as const;
  }

  if (!sample.needsFollowUp || sample.followUpTaskId || sample.followedUpAt || sample.resultedInOrder) {
    return { created: false, reason: "not_applicable" } as const;
  }

  const ownerUserId = sample.salesRep?.user?.id;
  if (!ownerUserId) {
    return { created: false, reason: "missing_sales_rep_user" } as const;
  }

  const productLabel = sample.sku.product?.name ?? sample.sku.code ?? "sample";
  const brand = sample.sku.product?.brand;
  const title = brand ? `Follow up: ${brand} ${productLabel}` : `Follow up: ${productLabel}`;
  const description = sample.feedback
    ? `Customer feedback: ${sample.feedback}`
    : `Check if the customer is ready to order ${brand ? `${brand} ` : ""}${productLabel}.`;

  const dueDate = addDays(sample.tastedAt, 7);

  const task = await db.task.create({
    data: {
      tenantId: sample.tenantId,
      userId: ownerUserId,
      customerId: sample.customerId,
      title,
      description,
      dueAt: dueDate,
      status: "PENDING",
      priority: "MEDIUM",
    },
  });

  await db.sampleUsage.update({
    where: { id: sampleUsageId },
    data: {
      followUpTaskId: task.id,
    },
  });

  return { created: true, taskId: task.id } as const;
}

export async function runFollowUpAutomation(
  db: PrismaClient,
  options: FollowUpAutomationOptions = {},
): Promise<FollowUpAutomationResult> {
  const lookbackDays = options.lookbackDays ?? 45;
  const limitPerTenant = options.limitPerTenant ?? 500;
  const now = new Date();
  const windowStart = subDays(now, lookbackDays);

  const tenantFilter = options.tenantId
    ? { id: options.tenantId }
    : undefined;

  const tenants = await db.tenant.findMany({
    where: tenantFilter,
    select: {
      id: true,
      name: true,
    },
  });

  let samplesScanned = 0;
  let tasksCreated = 0;
  let skippedMissingOwner = 0;

  for (const tenant of tenants) {
    const samples = await db.sampleUsage.findMany({
      where: {
        tenantId: tenant.id,
        needsFollowUp: true,
        resultedInOrder: false,
        followedUpAt: null,
        followUpTaskId: null,
        tastedAt: {
          gte: windowStart,
          lte: now,
        },
      },
      select: {
        id: true,
      },
      take: limitPerTenant,
    });

    for (const sample of samples) {
      samplesScanned += 1;
      const result = await createFollowUpTaskForSampleUsage(db, sample.id);
      if (result.created) {
        tasksCreated += 1;
      } else if (result.reason === "missing_sales_rep_user") {
        skippedMissingOwner += 1;
      }
    }
  }

  return {
    tenantsProcessed: tenants.length,
    samplesScanned,
    tasksCreated,
    skippedMissingOwner,
  };
}

export async function getFollowUpAutomationStatus(
  db: PrismaClient,
  tenantId?: string,
): Promise<FollowUpAutomationStatus> {
  const tenantFilter = tenantId ? { tenantId } : undefined;

  const pendingFollowUps = await db.sampleUsage.count({
    where: {
      ...tenantFilter,
      needsFollowUp: true,
      resultedInOrder: false,
      followedUpAt: null,
    },
  });

  const withoutTask = await db.sampleUsage.count({
    where: {
      ...tenantFilter,
      needsFollowUp: true,
      resultedInOrder: false,
      followedUpAt: null,
      followUpTaskId: null,
    },
  });

  const overdueWithoutTask = await db.sampleUsage.count({
    where: {
      ...tenantFilter,
      needsFollowUp: true,
      resultedInOrder: false,
      followedUpAt: null,
      followUpTaskId: null,
      tastedAt: {
        lt: subDays(new Date(), 7),
      },
    },
  });

  const lastSampleWithTask = await db.sampleUsage.findFirst({
    where: {
      ...tenantFilter,
      followUpTaskId: {
        not: null,
      },
    },
    include: {
      followUpTask: {
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: {
      followUpTask: {
        createdAt: "desc",
      },
    },
  });

  return {
    pendingFollowUps,
    withoutTask,
    overdueWithoutTask,
    lastTaskCreatedAt: lastSampleWithTask?.followUpTask?.createdAt?.toISOString() ?? null,
  };
}
