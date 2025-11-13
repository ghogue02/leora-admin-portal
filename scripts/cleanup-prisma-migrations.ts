import { spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Update this list if additional migrations were applied manually.
const DEFAULT_MIGRATIONS = [
  "20251113000000_product_field_registry",
  "20251114093000_add_product_export_jobs",
];

async function getAlreadyRecorded(migrations: string[]) {
  if (!migrations.length) return new Set<string>();

  const rows = (await prisma.$queryRaw<
    { migration_name: string }[]
  >`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY(${migrations})`) ?? [];

  return new Set(rows.map((row) => row.migration_name));
}

function resolveMigration(name: string) {
  console.log(`\n🔧 Marking ${name} as applied via prisma migrate resolve...`);
  const result = spawnSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Failed to mark migration ${name} as applied. See output above for details.`);
  }
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const migrations = cliArgs.length ? cliArgs : DEFAULT_MIGRATIONS;

  if (!migrations.length) {
    console.log("No migrations provided. Pass migration names as CLI args or update DEFAULT_MIGRATIONS.");
    return;
  }

  console.log("📦 Checking Prisma migration records...");
  const alreadyRecorded = await getAlreadyRecorded(migrations);
  const pending = migrations.filter((name) => !alreadyRecorded.has(name));

  if (!pending.length) {
    console.log("✅ All listed migrations are already recorded. No cleanup required.");
    return;
  }

  console.log(`⚠️  ${pending.length} migration(s) missing from _prisma_migrations:`);
  pending.forEach((name) => console.log(`   • ${name}`));

  for (const name of pending) {
    resolveMigration(name);
  }

  const verification = (await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null }[]
  >`SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name = ANY(${migrations}) ORDER BY migration_name`) ?? [];

  console.log("\n✨ Verification — recorded migrations:");
  verification.forEach((row) => {
    console.log(`   • ${row.migration_name} (finished_at: ${row.finished_at ?? "NULL"})`);
  });
}

main()
  .catch((error) => {
    console.error("❌ Prisma cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
