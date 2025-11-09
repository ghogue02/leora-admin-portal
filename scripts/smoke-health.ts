#!/usr/bin/env tsx
import process from "node:process";

type HealthComponent = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail?: string;
};

async function main() {
  const [argBaseUrl, argTenantList] = process.argv.slice(2);
  const baseUrl = (process.env.SMOKE_BASE_URL ?? argBaseUrl ?? "http://localhost:3000").replace(/\/$/, "");
  const tenantEnv = process.env.SMOKE_TENANTS ?? argTenantList ?? process.env.DEFAULT_TENANT_SLUG ?? "well-crafted";
  const tenants = tenantEnv.split(",").map((tenant) => tenant.trim()).filter(Boolean);

  if (tenants.length === 0) {
    console.error("No tenants provided. Set SMOKE_TENANTS or pass a comma-separated list as the second argument.");
    process.exit(1);
  }

  console.log(`Running /api/health smoke test against ${baseUrl}`);

  let failures = 0;

  for (const tenant of tenants) {
    const url = `${baseUrl}/api/health?tenant=${encodeURIComponent(tenant)}&_=${Date.now()}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        failures += 1;
        console.error(`✖ ${tenant}: HTTP ${response.status}`);
        continue;
      }

      const payload = await response.json() as {
        status: "ok" | "warn" | "error";
        components: HealthComponent[];
        generatedAt?: string;
      };

      if (payload.status === "error") {
        failures += 1;
        const failingComponents = payload.components.filter((component) => component.status === "error");
        console.error(`✖ ${tenant}: status=error (${failingComponents.map((component) => component.label).join(", ") || "unknown"})`);
      } else {
        const warningComponents = payload.components.filter((component) => component.status === "warn");
        if (warningComponents.length > 0) {
          console.warn(`△ ${tenant}: degraded (${warningComponents.map((component) => component.label).join(", ")})`);
        } else {
          console.log(`✔ ${tenant}: healthy`);
        }
      }
    } catch (error) {
      failures += 1;
      console.error(`✖ ${tenant}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
