import type { JobRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type JobRunContext = {
  id: string;
  startedAt: Date;
  jobName: string;
};

export async function logJobRunStart(options: {
  jobName: string;
  tenantSlug?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<JobRunContext> {
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  const entry = await prisma.jobRunLog.create({
    data: {
      jobName: options.jobName,
      environment,
      tenantSlug: options.tenantSlug ?? resolveDefaultTenantSlug(),
      metadata: options.metadata ?? undefined,
      status: "RUNNING",
    },
  });

  return {
    id: entry.id,
    startedAt: entry.startedAt,
    jobName: entry.jobName,
  };
}

export async function logJobRunFinish(
  context: JobRunContext,
  status: JobRunStatus,
  options: {
    error?: unknown;
  } = {},
) {
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - context.startedAt.getTime();

  await prisma.jobRunLog.update({
    where: { id: context.id },
    data: {
      status,
      finishedAt,
      durationMs,
      errorMessage: options.error ? serializeError(options.error) : undefined,
    },
  }).catch((error) => {
    console.error("[job-logger] Failed to update job run log", error);
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 500);
  }
  return String(error).slice(0, 500);
}

function resolveDefaultTenantSlug() {
  return process.env.DEFAULT_TENANT_SLUG ?? process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? null;
}
