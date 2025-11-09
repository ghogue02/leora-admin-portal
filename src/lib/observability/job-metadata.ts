import { prisma } from "@/lib/prisma";

const FALLBACK_METADATA: Record<string, { owner?: string; schedule?: string; maxInterval?: number; contact?: string }> = {
  "supabase-replay": {
    owner: "Ops",
    schedule: "Every 15 min",
    maxInterval: 30,
    contact: "ops@leora.app",
  },
  "weekly-metrics-aggregation": {
    owner: "RevOps",
    schedule: "Mondays 1 AM",
    maxInterval: 7 * 24 * 60,
    contact: "revops@leora.app",
  },
};

export async function getJobMetadata() {
  const map = new Map<string, { owner?: string | null; schedule?: string | null; maxInterval?: number | null; contact?: string | null }>();
  try {
    const records = await prisma.$queryRawUnsafe<
      { job_name: string; owner: string | null; schedule: string | null; max_interval_minutes: number | null; contact?: string | null }[]
    >("select job_name, owner, schedule, max_interval_minutes, contact from observability.job_metadata");
    records.forEach((record) => {
      map.set(record.job_name, {
        owner: record.owner,
        schedule: record.schedule,
        maxInterval: record.max_interval_minutes ?? null,
        contact: record.contact ?? null,
      });
    });
  } catch (error) {
    console.warn("[observability] job metadata query failed; using fallbacks", error);
  }

  Object.entries(FALLBACK_METADATA).forEach(([job, info]) => {
    if (!map.has(job)) {
      map.set(job, info);
    }
  });

  return map;
}
