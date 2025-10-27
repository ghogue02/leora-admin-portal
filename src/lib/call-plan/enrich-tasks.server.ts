import type { Prisma, PrismaClient } from "@prisma/client";
import type { ActivityCategory } from "./task-metadata";
import { parseTaskMetadata, resolveActivityTypeMeta } from "./task-metadata";

type CustomerSelect = {
  id: true;
  name: true;
  city: true;
  state: true;
};

export type CallPlanTaskWithCustomer = Prisma.TaskGetPayload<{
  include: {
    customer: {
      select: CustomerSelect;
    };
  };
}>;

export interface EnrichedCallPlanTask extends CallPlanTaskWithCustomer {
  notes: string | null;
  activityTypeId: string | null;
  activityTypeCode: string | null;
  activityType: string;
  activityTypeKey: string;
  activityTypeLabel: string;
  activityTypeName: string;
  activityTypeCategory: ActivityCategory;
  outcomeType: string | null;
  outcomeTimestamp: string | null;
  contactOutcome: "contacted" | "visited" | null;
  markedAt?: string | null;
}

export const enrichCallPlanTasks = async (
  tasks: CallPlanTaskWithCustomer[],
  {
    db,
    tenantId,
  }: {
    db: PrismaClient;
    tenantId: string;
  }
): Promise<EnrichedCallPlanTask[]> => {
  if (tasks.length === 0) {
    return [];
  }

  const parsed = tasks.map((task) => ({
    task,
    metadata: parseTaskMetadata(task.description),
  }));

  const activityTypeIds = Array.from(
    new Set(
      parsed
        .map(({ metadata }) => metadata.activityTypeId)
        .filter((id): id is string => Boolean(id))
    )
  );

  let activityTypeMap = new Map<
    string,
    {
      id: string;
      code: string | null;
      name: string | null;
    }
  >();

  if (activityTypeIds.length > 0) {
    const activityTypes = await db.activityType.findMany({
      where: {
        tenantId,
        id: {
          in: activityTypeIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    activityTypeMap = new Map(activityTypes.map((type) => [type.id, type]));
  }

  return parsed.map(({ task, metadata }) => {
    const activityRecord = metadata.activityTypeId
      ? activityTypeMap.get(metadata.activityTypeId)
      : undefined;
    const activityMeta = resolveActivityTypeMeta({
      code: activityRecord?.code,
      name: activityRecord?.name,
    });

    const notes = metadata.notes || "";
    const outcome = metadata.outcomeType?.toLowerCase() || null;
    const contactOutcome =
      outcome === "visited" ? "visited" : outcome === "contacted" ? "contacted" : null;

    return {
      ...task,
      description: notes || null,
      notes: notes || null,
      activityTypeId: metadata.activityTypeId,
      activityTypeCode: activityRecord?.code ?? null,
      activityType: activityMeta.key,
      activityTypeKey: activityMeta.key,
      activityTypeLabel: activityRecord?.name || activityMeta.label,
      activityTypeName: activityRecord?.name || activityMeta.label,
      activityTypeCategory: activityMeta.category,
      outcomeType: outcome,
      outcomeTimestamp: metadata.outcomeTimestamp,
      contactOutcome,
      markedAt: metadata.outcomeTimestamp,
    };
  });
};

