import type { PrismaClient, WebhookDelivery } from "@prisma/client";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000; // 1 minute

function getNextEligibleAt(lastDelivery: WebhookDelivery | undefined) {
  if (!lastDelivery) {
    return new Date(0);
  }
  const delay = BASE_BACKOFF_MS * Math.pow(2, Math.max(lastDelivery.attempt - 1, 0));
  return new Date(lastDelivery.createdAt.getTime() + delay);
}

export async function dispatchPendingWebhooks(db: PrismaClient) {
  const events = await db.webhookEvent.findMany({
    where: {
      OR: [
        {
          deliveries: {
            none: {},
          },
        },
        {
          deliveries: {
            some: {
              status: {
                in: ["FAILED", "RETRYING", "PENDING"],
              },
            },
          },
        },
      ],
    },
    include: {
      subscription: true,
      deliveries: {
        orderBy: {
          attempt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: BATCH_SIZE,
  });

  if (!events.length) {
    return;
  }

  const now = new Date();

  for (const event of events) {
    const subscription = event.subscription;
    if (!subscription || !subscription.enabled) {
      continue;
    }

    const lastDelivery = event.deliveries[0];
    const attempts = event.deliveries.length;

    if (attempts >= MAX_ATTEMPTS) {
      continue;
    }

    const eligibleAt = getNextEligibleAt(lastDelivery);
    if (eligibleAt > now) {
      continue;
    }

    const attempt = attempts + 1;

    console.info(
      `[jobs] Dispatching webhook event ${event.id} to ${subscription.targetUrl} (attempt ${attempt}).`,
    );

    await db.webhookDelivery.create({
      data: {
        webhookEventId: event.id,
        attempt,
        status: attempt === 1 ? "PENDING" : "RETRYING",
        createdAt: now,
      },
    });

    // Placeholder: integrate real HTTP call + status update.
  }
}
