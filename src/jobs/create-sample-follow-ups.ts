import { PrismaClient } from "@prisma/client";
import { runFollowUpAutomation } from "@/lib/samples/follow-up-automation";

const prisma = new PrismaClient();

export async function run() {
  try {
    const result = await runFollowUpAutomation(prisma);
    console.log(
      `[SampleFollowUps] Processed ${result.tenantsProcessed} tenants, scanned ${result.samplesScanned} samples, created ${result.tasksCreated} tasks (skipped ${result.skippedMissingOwner}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Sample follow-up automation failed", error);
    process.exit(1);
  });
}
