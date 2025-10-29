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
  contactOutcome: "in_person" | "phone" | "email" | "text" | null;
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

    const normalizeOutcome = (
      value: string | null
    ): "in_person" | "phone" | "email" | "text" | null => {
      if (!value) return null;
      if (["visited", "in_person", "in-person", "inperson"].includes(value)) {
        return "in_person";
      }
      if (["phone", "call", "contacted", "called"].includes(value)) {
        return "phone";
      }
      if (["email", "email_sent", "emailed"].includes(value)) {
        return "email";
      }
      if (["text", "sms", "message"].includes(value)) {
        return "text";
      }
      return null;
    };

    const contactOutcome = normalizeOutcome(outcome);

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
      outcomeType: contactOutcome,
      outcomeTimestamp: metadata.outcomeTimestamp,
      contactOutcome,
      markedAt: metadata.outcomeTimestamp,
    };
  });
};
