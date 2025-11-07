import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

const sampleItemSchema = z.object({
  skuId: z.string().uuid(),
  sampleListItemId: z.string().uuid().optional(),
  feedback: z.string().max(1000).optional(),
  followUpNeeded: z.boolean().optional(),
  quantity: z.number().int().min(1).max(100).optional(),
});

export type SampleItemInput = z.infer<typeof sampleItemSchema>;

export const sampleItemsInputSchema = z.array(sampleItemSchema).optional();

export const activitySampleItemSelect = {
  id: true,
  skuId: true,
  sampleListItemId: true,
  feedback: true,
  followUpNeeded: true,
  followUpCompletedAt: true,
  createdAt: true,
  updatedAt: true,
  sku: {
    select: {
      id: true,
      code: true,
      size: true,
      unitOfMeasure: true,
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
        },
      },
    },
  },
} satisfies Prisma.ActivitySampleItemSelect;

export const activitySampleItemWithActivitySelect = {
  id: true,
  activityId: true,
  sampleListItemId: true,
  feedback: true,
  followUpNeeded: true,
  followUpCompletedAt: true,
  createdAt: true,
  activity: {
    select: {
      id: true,
      subject: true,
      occurredAt: true,
      activityType: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  sku: {
    select: {
      id: true,
      code: true,
      size: true,
      unitOfMeasure: true,
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
        },
      },
    },
  },
} satisfies Prisma.ActivitySampleItemSelect;

export type ActivitySampleItemWithActivity = Prisma.ActivitySampleItemGetPayload<{
  select: typeof activitySampleItemWithActivitySelect;
}>;

export type SerializedActivity = ReturnType<typeof serializeActivityRecord>;

export const serializeActivityRecord = (activity: any) => ({
  id: activity.id,
  subject: activity.subject,
  notes: activity.notes,
  occurredAt: activity.occurredAt instanceof Date ? activity.occurredAt.toISOString() : activity.occurredAt,
  followUpAt: activity.followUpAt instanceof Date
    ? activity.followUpAt.toISOString()
    : activity.followUpAt ?? null,
  outcome: activity.outcomes?.[0] ?? null,
  outcomes: activity.outcomes ?? [],
  createdAt: activity.createdAt instanceof Date ? activity.createdAt.toISOString() : activity.createdAt,
  activityType: activity.activityType,
  customer: activity.customer,
  order: activity.order
    ? {
        id: activity.order.id,
        orderedAt: activity.order.orderedAt instanceof Date
          ? activity.order.orderedAt.toISOString()
          : activity.order.orderedAt ?? null,
        total: Number(activity.order.total ?? 0),
        status: activity.order.status,
      }
    : null,
  sample: activity.sample
    ? {
        id: activity.sample.id,
        sentAt: activity.sample.sentAt instanceof Date
          ? activity.sample.sentAt.toISOString()
          : activity.sample.sentAt ?? null,
      }
    : activity.sample ?? null,
  user: activity.user
    ? {
        id: activity.user.id,
        fullName: activity.user.fullName,
        email: activity.user.email,
      }
    : null,
  samples: (activity.sampleItems ?? []).map((item: any) => ({
    id: item.id,
    skuId: item.skuId,
    sampleListItemId: item.sampleListItemId ?? null,
    feedback: item.feedback ?? "",
    followUpNeeded: item.followUpNeeded ?? false,
    followUpCompletedAt: item.followUpCompletedAt instanceof Date
      ? item.followUpCompletedAt.toISOString()
      : item.followUpCompletedAt ?? null,
    sku: item.sku
      ? {
          id: item.sku.id,
          code: item.sku.code,
          name: item.sku.product?.name ?? null,
          brand: item.sku.product?.brand ?? null,
          unitOfMeasure: item.sku.unitOfMeasure ?? null,
          size: item.sku.size ?? null,
        }
      : null,
  })),
});

export const serializeSampleFollowUp = (item: ActivitySampleItemWithActivity) => ({
  id: item.id,
  activityId: item.activityId,
  sampleListItemId: item.sampleListItemId ?? null,
  feedback: item.feedback ?? "",
  followUpNeeded: item.followUpNeeded ?? false,
  followUpCompletedAt: item.followUpCompletedAt
    ? item.followUpCompletedAt.toISOString()
    : null,
  createdAt: item.createdAt.toISOString(),
  activity: item.activity
    ? {
        id: item.activity.id,
        subject: item.activity.subject,
        occurredAt: item.activity.occurredAt instanceof Date
          ? item.activity.occurredAt.toISOString()
          : item.activity.occurredAt ?? null,
        activityType: item.activity.activityType
          ? {
              id: item.activity.activityType.id,
              name: item.activity.activityType.name,
              code: item.activity.activityType.code,
            }
          : null,
        customer: item.activity.customer
          ? {
              id: item.activity.customer.id,
              name: item.activity.customer.name,
            }
          : null,
      }
    : null,
  sku: item.sku
    ? {
        id: item.sku.id,
        code: item.sku.code,
        name: item.sku.product?.name ?? null,
        brand: item.sku.product?.brand ?? null,
        unitOfMeasure: item.sku.unitOfMeasure ?? null,
        size: item.sku.size ?? null,
      }
    : null,
});

export type SerializedSampleFollowUp = ReturnType<typeof serializeSampleFollowUp>;

export async function ensureSampleItemsValid(
  db: PrismaClient,
  tenantId: string,
  salesRepId: string,
  items: Array<{
    skuId: string;
    sampleListItemId?: string;
  }>
) {
  if (items.length === 0) {
    return;
  }

  const uniqueSkuIds = Array.from(new Set(items.map((item) => item.skuId)));
  if (uniqueSkuIds.length > 0) {
    const validSkuCount = await db.sku.count({
      where: {
        id: { in: uniqueSkuIds },
        tenantId,
      },
    });

    if (validSkuCount !== uniqueSkuIds.length) {
      throw new Error("INVALID_SKU_SELECTION");
    }
  }

  const sampleListItemIds = items
    .map((item) => item.sampleListItemId)
    .filter((id): id is string => Boolean(id));

  if (sampleListItemIds.length > 0) {
    const listItems = await db.sampleListItem.findMany({
      where: {
        id: { in: sampleListItemIds },
        sampleList: {
          tenantId,
          salesRepId,
        },
      },
      select: {
        id: true,
        skuId: true,
      },
    });

    if (listItems.length !== sampleListItemIds.length) {
      throw new Error("INVALID_SAMPLE_LIST_ITEM");
    }

    const listItemSkuMap = new Map(listItems.map((item) => [item.id, item.skuId]));
    const mismatch = items.find(
      (item) => item.sampleListItemId && listItemSkuMap.get(item.sampleListItemId) !== item.skuId
    );

    if (mismatch) {
      throw new Error("SAMPLE_LIST_ITEM_MISMATCH");
    }
  }
}

export async function createActivitySampleItems(
  db: PrismaClient | Prisma.TransactionClient,
  activityId: string,
  items: SampleItemInput[],
) {
  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    try {
      await db.activitySampleItem.create({
        data: {
          activityId,
          skuId: item.skuId,
          sampleListItemId: item.sampleListItemId ?? null,
          feedback: item.feedback ?? null,
          followUpNeeded: item.followUpNeeded ?? false,
        },
      });
    } catch (error) {
      if (
        item.sampleListItemId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        console.warn(
          "⚠️ [Activities] Sample list item reference invalid, retrying without list item",
          {
            activityId,
            skuId: item.skuId,
            sampleListItemId: item.sampleListItemId,
            code: error.code,
            message: error.message,
          }
        );

        await db.activitySampleItem.create({
          data: {
            activityId,
            skuId: item.skuId,
            sampleListItemId: null,
            feedback: item.feedback ?? null,
            followUpNeeded: item.followUpNeeded ?? false,
          },
        });
        continue;
      }

      throw error;
    }
  }
}

export async function createSampleUsageEntries(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    tenantId: string;
    salesRepId: string;
    customerId: string;
    occurredAt: Date;
    sampleSource: string;
    items: SampleItemInput[];
  },
) {
  const { tenantId, salesRepId, customerId, occurredAt, sampleSource, items } = params;
  if (!items.length) return;

  await Promise.all(
    items.map((item) =>
      db.sampleUsage.create({
        data: {
          tenantId,
          salesRepId,
          customerId,
          skuId: item.skuId,
          quantity: item.quantity ?? 1,
          tastedAt: occurredAt,
          feedback: item.feedback ?? null,
          needsFollowUp: item.followUpNeeded ?? false,
          sampleSource,
        },
      }),
    ),
  );
}

export async function createFollowUpTasksForSamples(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    tenantId: string;
    userId: string;
    customerId: string;
    occurredAt: Date;
    items: SampleItemInput[];
  },
) {
  const { tenantId, userId, customerId, occurredAt, items } = params;
  const flaggedItems = items.filter((item) => item.followUpNeeded);
  if (!flaggedItems.length) return;

  const uniqueSkuIds = Array.from(new Set(flaggedItems.map((item) => item.skuId)));
  const skus = await db.sku.findMany({
    where: {
      tenantId,
      id: { in: uniqueSkuIds },
    },
    select: {
      id: true,
      code: true,
      product: {
        select: {
          name: true,
          brand: true,
        },
      },
    },
  });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  await Promise.all(
    flaggedItems.map((item) => {
      const sku = skuMap.get(item.skuId);
      const productLabel =
        sku?.product?.brand && sku.product.name
          ? `${sku.product.brand} ${sku.product.name}`.trim()
          : sku?.product?.name ?? sku?.code ?? "sample item";

      const dueDate = new Date(occurredAt);
      dueDate.setDate(dueDate.getDate() + 7);

      return db.task.create({
        data: {
          tenantId,
          userId,
          customerId,
          title: `Follow up on ${productLabel} sample`,
          description: item.feedback
            ? `Customer feedback: ${item.feedback}`
            : `Check if the customer is ready to order ${productLabel}.`,
          dueAt: dueDate,
          status: "PENDING",
          priority: "MEDIUM",
        },
      });
    }),
  );
}
