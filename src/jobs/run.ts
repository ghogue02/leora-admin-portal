import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { logJobRunFinish, logJobRunStart } from "@/lib/observability/job-logger";

async function main() {
  loadEnv();

  const { jobName, tenantOverride } = parseCliArgs(process.argv.slice(2));
  if (!jobName) {
    throw new Error("Usage: npm run jobs:run -- <job-name> [--tenant <slug>]");
  }

  const jobModule = await import(`./${jobName}.js`).catch(async () => import(`./${jobName}`));
  const runner = jobModule.run ?? jobModule.default;

  if (typeof runner !== "function") {
    throw new Error(`Job "${jobName}" does not export a runnable function.`);
  }

  const tenantSlug =
    tenantOverride ||
    process.env.TENANT_SLUG ||
    process.env.DEFAULT_TENANT_SLUG ||
    process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ||
    null;

  if (tenantSlug) {
    process.env.TENANT_SLUG = tenantSlug;
  }

  const runContext = await logJobRunStart({
    jobName,
    tenantSlug,
    metadata: {
      argv: argsSummary(process.argv.slice(2)),
      startedAt: new Date().toISOString(),
    },
  });

  try {
    await runner();
    await logJobRunFinish(runContext, "SUCCESS");
  } catch (error) {
    await logJobRunFinish(runContext, "FAILED", { error });
    throw error;
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function loadEnv() {
  const cwd = process.cwd();
  const localEnvPath = resolve(cwd, ".env.local");
  if (existsSync(localEnvPath)) {
    config({ path: localEnvPath });
  }

  config();
}

function parseCliArgs(args: string[]) {
  let jobName: string | undefined;
  let tenantOverride: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!jobName && !arg.startsWith("--")) {
      jobName = arg;
      continue;
    }

    if (arg.startsWith("--tenant=")) {
      tenantOverride = arg.split("=")[1] ?? null;
      continue;
    }

    if (arg.startsWith("--tenant-slug=")) {
      tenantOverride = arg.split("=")[1] ?? null;
      continue;
    }

    if (arg === "--tenant" || arg === "--tenant-slug") {
      tenantOverride = args[i + 1] ?? null;
      i += 1;
    }
  }

  return { jobName, tenantOverride };
}

function argsSummary(args: string[]) {
  return args.map((arg) => (arg.startsWith("--") ? arg.split("=")[0] : arg)).join(" ");
}
