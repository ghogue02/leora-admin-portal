import { ReplayRunStatus } from "@prisma/client";
import { withTenant } from "@/lib/prisma";
import { run as runSupabaseReplayJob } from "@/jobs/supabase-replay";

export async function triggerReplayRun(tenantId: string) {
  const activeRun = await withTenant(tenantId, async (tx) => {
    return tx.portalReplayStatus.findFirst({
      where: {
        tenantId,
        status: ReplayRunStatus.RUNNING,
        startedAt: {
          gte: new Date(Date.now() - 5 * 60_000),
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });
  });

  if (activeRun) {
    throw new Error("Replay already running. Give it a moment, then refresh.");
  }

  await runSupabaseReplayJob({
    tenantId,
    disconnectAfterRun: false,
  });
}
