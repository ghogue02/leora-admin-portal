import process from "node:process";
import { prisma } from "@/lib/prisma";
import { jobs } from "./index";

async function main() {
  const jobId = process.argv[2];
  const selectedJobs = jobId ? jobs.filter((job) => job.id === jobId) : jobs;

  if (jobId && selectedJobs.length === 0) {
    console.error(`[jobs] No job found matching id "${jobId}". Available jobs: ${jobs.map((job) => job.id).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  for (const job of selectedJobs) {
    const started = Date.now();
    console.info(`[jobs] Starting ${job.id} – ${job.description}`);
    try {
      await job.handler(prisma);
      console.info(`[jobs] Completed ${job.id} in ${Date.now() - started}ms`);
    } catch (error) {
      console.error(`[jobs] Failed ${job.id}:`, error);
    }
  }
}

main()
  .catch((error) => {
    console.error("[jobs] Unhandled error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
