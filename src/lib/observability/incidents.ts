import { HealthPingStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

const COOLDOWN_MINUTES = Number(process.env.INCIDENT_ALERT_COOLDOWN_MINUTES ?? 30);

export async function maybeSendIncidentAlert(pingId: string) {
  const webhook = getWebhook();
  if (!webhook) {
    return;
  }

  const ping = await prisma.healthPingLog.findUnique({ where: { id: pingId } });
  if (!ping || !isCriticalStatus(ping.status)) {
    return;
  }

  const since = new Date(ping.checkedAt.getTime() - COOLDOWN_MINUTES * 60 * 1000);
  const existing = await prisma.healthPingLog.findFirst({
    where: {
      id: { not: ping.id },
      targetTenant: ping.targetTenant,
      status: { in: criticalStatuses },
      checkedAt: { gte: since },
      acknowledgedAt: null,
    },
    orderBy: { checkedAt: "desc" },
  });

  if (existing) {
    return;
  }

  await postWebhook(webhook, {
    text: `🚨 *Health Alert* (${ping.targetTenant ?? "unknown tenant"})\nStatus: ${ping.status}\nDetail: ${ping.detail ?? "n/a"}\nChecked at: ${ping.checkedAt.toISOString()}`,
  });
}

export async function notifyIncidentAcknowledged(pingId: string, user: { email: string; name: string }) {
  const webhook = getWebhook();
  if (!webhook) {
    return;
  }
  const ping = await prisma.healthPingLog.findUnique({ where: { id: pingId } });
  if (!ping) {
    return;
  }

  await postWebhook(webhook, {
    text: `✅ Incident acknowledged for ${ping.targetTenant ?? "unknown tenant"} by ${user.name} (${user.email}).`,
  });
}

const criticalStatuses: HealthPingStatus[] = ["DOWN", "DEGRADED"];

function isCriticalStatus(status: HealthPingStatus) {
  return criticalStatuses.includes(status);
}

function getWebhook() {
  return process.env.INCIDENT_ALERT_WEBHOOK ?? process.env.SUPPORT_ALERT_WEBHOOK ?? null;
}

async function postWebhook(url: string, payload: unknown) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[incident] failed to post webhook", error);
  }
}
