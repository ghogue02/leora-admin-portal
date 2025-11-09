import { NextRequest, NextResponse } from "next/server";
import type { HealthPingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maybeSendIncidentAlert } from "@/lib/observability/incidents";

const AUTH_HEADER = "x-monitor-key";
const CRON_HEADER = "x-vercel-cron";

export async function GET(request: NextRequest) {
  return handlePingRequest(request);
}

export async function POST(request: NextRequest) {
  return handlePingRequest(request);
}

async function handlePingRequest(request: NextRequest) {
  const monitorKey = process.env.DEVOPS_MONITOR_KEY;
  const isCronInvocation = Boolean(request.headers.get(CRON_HEADER));

  if (!isCronInvocation) {
    if (!monitorKey) {
      return NextResponse.json({ error: "Monitor key not configured" }, { status: 501 });
    }

    const providedKey = request.headers.get(AUTH_HEADER) ?? request.nextUrl.searchParams.get("token");
    if (!providedKey || providedKey !== monitorKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const tenantSlug = request.nextUrl.searchParams.get("tenant")
    ?? process.env.DEFAULT_TENANT_SLUG
    ?? process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG
    ?? null;

  const origin = new URL(request.url).origin;
  const result = await runInternalHealthCheck(origin, tenantSlug);

  const ping = await prisma.healthPingLog.create({
    data: {
      source: isCronInvocation ? "vercel-cron" : "supabase-cron",
      targetTenant: tenantSlug ?? undefined,
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      detail: result.detail,
    },
  });

  await maybeSendIncidentAlert(ping.id);

  return NextResponse.json(result);
}

async function runInternalHealthCheck(origin: string, tenantSlug: string | null) {
  const start = Date.now();
  let responseTimeMs = 0;
  let status: HealthPingStatus = "UP";
  let detail = "OK";
  let statusCode = 200;

  try {
    const healthUrl = new URL("/api/health", origin);
    if (tenantSlug) {
      healthUrl.searchParams.set("tenant", tenantSlug);
    }

    const response = await fetch(healthUrl, { cache: "no-store" });
    responseTimeMs = Date.now() - start;
    statusCode = response.status;

    if (!response.ok) {
      status = "DOWN";
      detail = (await response.text()).slice(0, 300);
    }
  } catch (error) {
    responseTimeMs = Date.now() - start;
    status = "DOWN";
    statusCode = 0;
    detail = (error instanceof Error ? error.message : String(error)).slice(0, 300);
  }

  return {
    status,
    detail,
    responseTimeMs,
    statusCode,
  };
}
