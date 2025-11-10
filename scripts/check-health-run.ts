#!/usr/bin/env tsx
import process from "node:process";

type HealthComponent = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail?: string;
};

async function check(baseUrl: string, tenant: string) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/health?tenant=${encodeURIComponent(tenant)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { status: "ok" | "warn" | "error"; components: HealthComponent[] };
  if (payload.status === "error") {
    const failing = payload.components.filter((component) => component.status === "error");
    throw new Error(`status=error (${failing.map((component) => component.label).join(", ")})`);
  }
}

async function main() {
  const baseUrl = "https://web-omega-five-81.vercel.app";
  try {
    await check(baseUrl, "well-crafted");
    console.log("Health check succeeded locally; GitHub failure likely due to network or auth.");
  } catch (error) {
    console.error("Health check failed:", error);
  }
}

main();
