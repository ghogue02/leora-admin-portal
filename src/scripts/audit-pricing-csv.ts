/**
 * Audit Pricing CSV - Analyze pricing source without database access
 * Generates report of what pricing SHOULD be based on CSV
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const PRICING_CSV = path.resolve(
  process.cwd(),
  "../Pricing Single Source - Pricing Single Source.csv",
);

type PricingRow = {
  Origin: string;
  Region: string;
  Supplier: string;
  Item: string;
  Unit: string;
  SKU: string;
  "Frontline WCB Price": string;
  "Discount WCB Price": string;
  "BTG- On Premise Only": string;
  "Special Pricing 1": string;
  Terms: string;
};

function parsePrice(input?: string | null): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[,$]/g, "").trim();
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function main() {
  console.log(`\n📄 Analyzing pricing CSV: ${PRICING_CSV}\n`);

  if (!fs.existsSync(PRICING_CSV)) {
    throw new Error(`CSV not found at ${PRICING_CSV}`);
  }

  const csvContent = fs.readFileSync(PRICING_CSV, "utf-8");
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as PricingRow[];

  console.log(`📊 CSV contains ${rows.length} total rows\n`);

  // Statistics
  const stats = {
    totalSKUs: rows.length,
    withFrontline: 0,
    withDiscount: 0,
    withBTG: 0,
    withSpecial: 0,
    missingAllPrices: 0,
    skuPrefixes: new Map<string, number>(),
    origins: new Map<string, number>(),
    suppliers: new Map<string, number>(),
  };

  const issues: Array<{ sku: string; issue: string }> = [];
  const missingPrices: Array<{ sku: string; item: string; missing: string[] }> = [];

  // Analyze each row
  for (const row of rows) {
    const sku = row.SKU?.trim();
    if (!sku) {
      issues.push({ sku: "UNKNOWN", issue: "Row missing SKU code" });
      continue;
    }

    // Track prefix
    const prefix = sku.substring(0, 3);
    stats.skuPrefixes.set(prefix, (stats.skuPrefixes.get(prefix) || 0) + 1);

    // Track origin
    const origin = row.Origin?.trim();
    if (origin) {
      stats.origins.set(origin, (stats.origins.get(origin) || 0) + 1);
    }

    // Track supplier
    const supplier = row.Supplier?.trim();
    if (supplier) {
      stats.suppliers.set(supplier, (stats.suppliers.get(supplier) || 0) + 1);
    }

    // Check pricing
    const frontline = parsePrice(row["Frontline WCB Price"]);
    const discount = parsePrice(row["Discount WCB Price"]);
    const btg = parsePrice(row["BTG- On Premise Only"]);
    const special = parsePrice(row["Special Pricing 1"]);

    if (frontline) stats.withFrontline++;
    if (discount) stats.withDiscount++;
    if (btg) stats.withBTG++;
    if (special) stats.withSpecial++;

    const missing: string[] = [];
    if (!frontline) missing.push("Frontline");
    if (!discount) missing.push("Discount");

    if (missing.length > 0) {
      missingPrices.push({
        sku,
        item: row.Item,
        missing,
      });
    }

    if (!frontline && !discount && !btg && !special) {
      stats.missingAllPrices++;
      issues.push({ sku, issue: "No prices in any column" });
    }
  }

  // Print statistics
  console.log("═══════════════════════════════════════════════════════");
  console.log("                   PRICING CSV SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`📦 Total SKUs: ${stats.totalSKUs}`);
  console.log(`✅ With Frontline pricing: ${stats.withFrontline} (${((stats.withFrontline / stats.totalSKUs) * 100).toFixed(1)}%)`);
  console.log(`✅ With Discount pricing: ${stats.withDiscount} (${((stats.withDiscount / stats.totalSKUs) * 100).toFixed(1)}%)`);
  console.log(`⚠️  With BTG pricing: ${stats.withBTG} (${((stats.withBTG / stats.totalSKUs) * 100).toFixed(1)}%)`);
  console.log(`⚠️  With Special pricing: ${stats.withSpecial} (${((stats.withSpecial / stats.totalSKUs) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing all prices: ${stats.missingAllPrices}\n`);

  console.log("═══════════════════════════════════════════════════════");
  console.log("                   SKU PREFIXES");
  console.log("═══════════════════════════════════════════════════════\n");

  const sortedPrefixes = Array.from(stats.skuPrefixes.entries())
    .sort((a, b) => b[1] - a[1]);
  sortedPrefixes.forEach(([prefix, count]) => {
    console.log(`${prefix}: ${count} SKUs`);
  });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("                   ORIGINS/REGIONS");
  console.log("═══════════════════════════════════════════════════════\n");

  const sortedOrigins = Array.from(stats.origins.entries())
    .sort((a, b) => b[1] - a[1]);
  sortedOrigins.forEach(([origin, count]) => {
    console.log(`${origin}: ${count} SKUs`);
  });

  if (missingPrices.length > 0) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("         SKUs MISSING FRONTLINE OR DISCOUNT");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(`Found ${missingPrices.length} SKUs with incomplete pricing:\n`);

    missingPrices.slice(0, 20).forEach(({ sku, item, missing }) => {
      console.log(`${sku} - ${item}`);
      console.log(`  Missing: ${missing.join(", ")}\n`);
    });

    if (missingPrices.length > 20) {
      console.log(`... and ${missingPrices.length - 20} more\n`);
    }
  }

  if (issues.length > 0) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("                     ISSUES FOUND");
    console.log("═══════════════════════════════════════════════════════\n");

    issues.forEach(({ sku, issue }) => {
      console.log(`❌ ${sku}: ${issue}`);
    });
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("                  EXPECTED BEHAVIOR");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("After sync, Leora should have:");
  console.log(`- ${stats.withFrontline} SKUs with Frontline pricing`);
  console.log(`- ${stats.withDiscount} SKUs with Discount pricing`);
  console.log(`- ${stats.withBTG} SKUs with BTG pricing`);
  console.log(`- ${stats.withSpecial} SKUs with Special pricing\n`);

  console.log("Catalog will show (priority order):");
  console.log("1. Frontline price (if exists)");
  console.log("2. Discount price (if Frontline missing)");
  console.log("3. 'No price set' (if both missing)\n");

  console.log("✅ Audit complete!\n");
}

main().catch((error) => {
  console.error("❌ Audit failed:", error);
  process.exit(1);
});
