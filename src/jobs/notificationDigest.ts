import type { PrismaClient } from "@prisma/client";

const DIGEST_WINDOW_HOURS = 24;

export async function runNotificationDigest(db: PrismaClient) {
  const since = new Date(Date.now() - DIGEST_WINDOW_HOURS * 60 * 60 * 1000);

  const tenants = await db.portalNotification.groupBy({
    by: ["tenantId"],
    where: {
      createdAt: {
        gte: since,
      },
      readAt: null,
    },
    _count: {
      _all: true,
    },
  });

  if (!tenants.length) {
    return;
  }

  for (const tenant of tenants) {
    const unreadByUser = await db.portalNotification.groupBy({
      by: ["portalUserId", "category"],
      where: {
        tenantId: tenant.tenantId,
        createdAt: {
          gte: since,
        },
        readAt: null,
      },
      _count: {
        _all: true,
      },
    });

    const digest = unreadByUser.reduce<Record<string, Record<string, number>>>((acc, item) => {
      if (!acc[item.portalUserId]) {
        acc[item.portalUserId] = {};
      }
      acc[item.portalUserId][item.category] = item._count._all;
      return acc;
    }, {});

    await deliverDigest(tenant.tenantId, digest);
  }
}

const targetMap = (() => {
  const raw = process.env.NOTIFICATION_DIGEST_TARGETS;
  if (!raw) {
    return {} as Record<string, { type: string; target: string }>;
  }
  try {
    return JSON.parse(raw) as Record<string, { type: string; target: string }>;
  } catch (error) {
    console.warn("[jobs] Failed to parse NOTIFICATION_DIGEST_TARGETS", error);
    return {} as Record<string, { type: string; target: string }>;
  }
})();

async function deliverDigest(
  tenantId: string,
  digest: Record<string, Record<string, number>>,
) {
  const target = targetMap[tenantId] ?? targetMap.default;
  if (!target) {
    console.info(`[jobs] Stub delivery (no target configured) for tenant ${tenantId}`, JSON.stringify(digest));
    return;
  }

  console.info(
    `[jobs] Stub delivery to ${target.type}:${target.target} for tenant ${tenantId}`,
    JSON.stringify(digest),
  );
  await Promise.resolve();
}
