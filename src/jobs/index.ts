import type { PrismaClient } from "@prisma/client";
import { dispatchPendingWebhooks } from "./webhookDispatcher";
import { runNotificationDigest } from "./notificationDigest";

export type JobDefinition = {
  id: string;
  description: string;
  handler: (db: PrismaClient) => Promise<void>;
};

export const jobs: JobDefinition[] = [
  {
    id: "notification-digest",
    description: "Aggregates unread notifications per tenant and prepares digests.",
    handler: runNotificationDigest,
  },
  {
    id: "dispatch-webhooks",
    description: "Attempts delivery for pending webhook events with exponential backoff.",
    handler: dispatchPendingWebhooks,
  },
];
