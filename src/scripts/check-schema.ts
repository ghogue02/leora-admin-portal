import { exit } from "node:process";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: resolve(process.cwd(), ".env.local") });

const REQUIRED_TABLES = [
  "tenant",
  "tenant_settings",
  "user",
  "role",
  "permission",
  "portal_user",
  "portal_session",
  "product",
  "sku",
  "inventory",
  "price_list",
  "order",
  "order_line",
  "invoice",
  "payment",
  "cart",
  "cart_item",
  "activity",
  "activity_type",
  "account_health_snapshot",
  "sales_metric",
  "webhook_subscription",
  "webhook_event",
  "webhook_delivery",
  "integration_token",
  "support_ticket",
  "support_ticket_attachment",
  "portal_replay_status",
];

async function main() {
  console.log("🔎 Auditing public schema for required tables…");

  if (!process.env.DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL not set. Populate .env.local before running schema audit.");
    exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const { rows } = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
  );

  const normalize = (value: string) => value.replace(/_/g, "").toLowerCase();
  const existing = new Set(rows.map((record) => normalize(record.table_name)));
  const missing = REQUIRED_TABLES.filter((table) => !existing.has(normalize(table)));

  if (missing.length === 0) {
    console.log("✅ All expected tables present in public schema.");
  } else {
    console.warn("⚠️  Missing tables detected:");
    missing.forEach((table) => console.warn(`  • ${table}`));
    console.warn("Add these models to Prisma and rerun migrations to align with Supabase.");
    exit(1);
  }

  await client.end();
}

main()
  .catch((error) => {
    console.error("Schema audit failed:", error);
    exit(1);
  })
