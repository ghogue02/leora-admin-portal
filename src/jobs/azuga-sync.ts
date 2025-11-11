/**
 * Azuga Integration Readiness Job
 *
 * Reads AzugaIntegrationSettings for the active tenant and logs which
 * subsystems (telemetry polling, route export/import, webhook ingestion)
 * should be running. Acts as scaffolding for future Azuga sync jobs.
 *
 * Usage:
 *   npm run jobs:run -- azuga-sync --tenant well-crafted
 */

import prisma from "@/lib/prisma";
import { loadAzugaIntegrationConfig } from "@/lib/azuga/config";

type FeatureFlags = {
  telemetry: boolean;
  routeExport: boolean;
  routeImport: boolean;
  webhook: boolean;
};

export async function run() {
  const tenantSlug =
    process.env.TENANT_SLUG ||
    process.env.DEFAULT_TENANT_SLUG ||
    process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG;

  if (!tenantSlug) {
    throw new Error("TENANT_SLUG (or DEFAULT_TENANT_SLUG) must be provided to run the Azuga job.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });

  if (!tenant) {
    throw new Error(`Tenant with slug "${tenantSlug}" not found.`);
  }

  const config = await loadAzugaIntegrationConfig(tenant.id);
  if (!config) {
    console.log(`[Azuga] Tenant "${tenant.name}" has not stored Azuga settings yet.`);
    return;
  }

  console.log(`[Azuga] Tenant: ${tenant.name}`);
  console.log(
    `[Azuga] Status: ${config.status} | Env: ${config.environment} | Rate limit: ${config.rateLimitPerMinute}/minute`,
  );

  const enabledWork = summarizeEnabledWork(config.features);

  if (enabledWork.length === 0) {
    console.log("[Azuga] No Azuga features are enabled yet. Toggle them from the Admin portal.");
    return;
  }

  console.log("[Azuga] The following subsystems should be scheduled:");
  enabledWork.forEach((item) => console.log(`  • ${item}`));

  console.log(
    "[Azuga] Future tasks: attach live telemetry pollers, route exporters/importers, and webhook consumers here.",
  );
}

function summarizeEnabledWork(features: FeatureFlags) {
  const tasks: string[] = [];

  if (features.telemetry) {
    tasks.push("Live location polling (trackees/liveLocations)");
  }
  if (features.routeExport) {
    tasks.push("Outbound route export (orders → Azuga)");
  }
  if (features.routeImport) {
    tasks.push("Inbound route import (Azuga → Leora)");
  }
  if (features.webhook) {
    tasks.push("Webhook ingestion for GPS/TRIP/ALERT events");
  }

  return tasks;
}

if (require.main === module) {
  run()
    .then(() => {
      console.log("Azuga readiness check complete.");
    })
    .catch((error) => {
      console.error("Azuga readiness job failed:", error);
      process.exit(1);
    });
}
