#!/usr/bin/env tsx

/**
 * Inventory vs Well Crafted source audit
 *
 * Usage:
 *    npx tsx src/scripts/audit-inventory-sync.ts \
 *      --source "/path/to/Well Crafted ... 2025-11-13.csv" \
 *      --out audit
 *
 * Optional flags:
 *    --tenant <tenant-id>
 *    --tolerance 0.5   (matching threshold in bottles)
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ParsedArgs = Record<string, string>;

interface SourceSku {
  sku: string;
  productName: string;
  brand: string;
  bottles: number;
}

interface DbSkuRecord {
  sku: string;
  productName: string;
  brand: string;
  category?: string | null;
  isActive: boolean;
  catalogAvailable: number;
  inventoryAvailable: number;
  locations: Record<string, number>;
  catalogEligible: boolean;
}

interface AuditRecord {
  sku: string;
  productName: string;
  brand: string;
  sourceBottles: number;
  catalogAvailable: number;
  inventoryAvailable: number;
  difference: number;
  percentError: number | null;
  catalogEligible: boolean;
  isActive: boolean;
}

const DEFAULT_SOURCE_PATH =
  "/Users/greghogue/Leora2/Well Crafted Wine & Beverage Co. inventory as at 2025-11-13.csv";
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), "audit");
const DEFAULT_TENANT_ID = "58b8126a-2d2f-4f55-bc98-5b6784800bed";

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function stripExcelPrefixes(content: string) {
  const lines = content.split(/\r?\n/);
  while (lines.length > 0) {
    const trimmed = lines[0]?.trim() ?? "";
    if (
      trimmed === "" ||
      /^"?sep\s*=/.test(trimmed.toLowerCase()) ||
      /^"?.*inventory as at/.test(trimmed.toLowerCase()) ||
      trimmed === '" "'
    ) {
      lines.shift();
      continue;
    }
    break;
  }
  return lines.join("\n");
}

function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const sanitized = value.replace(/[^0-9.-]/g, "");
  if (!sanitized) return 0;
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, options: { decimals?: number } = {}) {
  const decimals = options.decimals ?? 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number, decimals = 1) {
  return `${formatNumber(value * 100, { decimals })}%`;
}

function toCsv(headers: string[], rows: Array<Record<string, string | number>>) {
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.map(escape).join(",");
  const body = rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","));
  return [headerLine, ...body].join("\n");
}

async function loadSourceSkus(sourcePath: string) {
  const raw = fs.readFileSync(sourcePath, "utf-8");
  const normalized = stripExcelPrefixes(raw);
  const rows = parse(normalized, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const sourceMap = new Map<string, SourceSku>();

  for (const row of rows) {
    const sku = row["SKU"]?.trim();
    if (!sku) continue;
    const cases = parseNumber(row["Cases"]);
    const itemsPerCase = parseNumber(row["Items per case"]) || 0;
    const looseUnits = parseNumber(row["Unit quantity"]);
    const bottles = looseUnits > 0 ? looseUnits : cases * itemsPerCase;

    const entry = sourceMap.get(sku) ?? {
      sku,
      productName: row["Name"]?.trim() || row["Product"]?.trim() || "",
      brand: row["Brand"]?.trim() || "",
      bottles: 0,
    };

    entry.bottles += bottles;
    entry.productName = entry.productName || row["Name"]?.trim() || "";
    entry.brand = entry.brand || row["Brand"]?.trim() || "";

    sourceMap.set(sku, entry);
  }

  return sourceMap;
}

function passesCatalogFilter(productName: string) {
  const normalized = productName?.trim() ?? "";
  if (normalized.length < 5) return false;
  if (/^\d+$/.test(normalized)) return false;
  if (/^[\d.]+\s+[\d.]+\s+[\d.]+/.test(normalized)) return false;
  const firstTen = normalized.substring(0, Math.min(10, normalized.length));
  if (/^[\d\s.]+$/.test(firstTen)) return false;
  if (/^0[\s.]/.test(normalized)) return false;
  return true;
}

async function loadDbSkus(tenantId: string): Promise<Map<string, DbSkuRecord>> {
  const skus = await prisma.sku.findMany({
    where: {
      tenantId,
    },
    include: {
      product: {
        select: {
          name: true,
          brand: true,
          category: true,
        },
      },
      inventories: {
        select: {
          location: true,
          onHand: true,
          allocated: true,
        },
      },
      priceListItems: {
        where: {
          priceList: {
            isDefault: true,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        },
        select: {
          price: true,
        },
        take: 1,
      },
    },
  });

  const dbMap = new Map<string, DbSkuRecord>();

  for (const sku of skus) {
    const total = sku.inventories.reduce(
      (acc, inv) => {
        const available = inv.onHand - inv.allocated;
        acc.onHand += inv.onHand;
        acc.available += available;
        acc.locations[inv.location] = (acc.locations[inv.location] ?? 0) + available;
        return acc;
      },
      { onHand: 0, available: 0, locations: {} as Record<string, number> },
    );

    const productName = sku.product?.name ?? "";
    const catalogEligible = sku.isActive && passesCatalogFilter(productName);

    dbMap.set(sku.code, {
      sku: sku.code,
      productName,
      brand: sku.product?.brand ?? "",
      category: sku.product?.category,
      isActive: sku.isActive,
      catalogAvailable: catalogEligible ? total.available : 0,
      inventoryAvailable: total.available,
      locations: total.locations,
      catalogEligible,
    });
  }

  return dbMap;
}

function buildAuditRecords(
  sourceMap: Map<string, SourceSku>,
  dbMap: Map<string, DbSkuRecord>,
  tolerance: number,
) {
  const allSkus = new Set<string>([...sourceMap.keys(), ...dbMap.keys()]);
  const records: AuditRecord[] = [];

  for (const sku of allSkus) {
    const source = sourceMap.get(sku);
    const db = dbMap.get(sku);

    const sourceBottles = Number(source?.bottles ?? 0);
    const catalogAvailable = Number(db?.catalogAvailable ?? 0);
    const inventoryAvailable = Number(db?.inventoryAvailable ?? 0);
    const difference = catalogAvailable - sourceBottles;
    const percentError =
      sourceBottles === 0 ? (catalogAvailable === 0 ? null : Infinity) : difference / sourceBottles;

    records.push({
      sku,
      productName: source?.productName || db?.productName || "",
      brand: source?.brand || db?.brand || "",
      sourceBottles,
      catalogAvailable,
      inventoryAvailable,
      difference,
      percentError,
      catalogEligible: Boolean(db?.catalogEligible),
      isActive: Boolean(db?.isActive),
    });
  }

  const sourceScoped = records.filter((rec) => rec.sourceBottles > tolerance);

  const stats = {
    totalSourceSkus: sourceMap.size,
    totalCatalogSkus: [...dbMap.values()].filter((sku) => sku.catalogEligible).length,
    totalInventorySkus: [...dbMap.values()].filter((sku) => sku.inventoryAvailable > tolerance).length,
    exactMatches: sourceScoped.filter((rec) => Math.abs(rec.difference) <= tolerance).length,
    closeMatches: sourceScoped.filter((rec) => Math.abs(rec.difference) > tolerance && Math.abs(rec.difference) <= 2).length,
    moderateDiscrepancies: sourceScoped.filter((rec) => Math.abs(rec.difference) > 2 && Math.abs(rec.difference) <= 10).length,
    largeDiscrepancies: sourceScoped.filter((rec) => Math.abs(rec.difference) > 10).length,
    catalogInventoryConsistency:
      records.length === 0
        ? 1
        : records.filter((rec) => Math.abs(rec.catalogAvailable - rec.inventoryAvailable) <= 1).length / records.length,
    missingFromCatalog: records.filter(
      (rec) => rec.sourceBottles > tolerance && Math.abs(rec.catalogAvailable) <= tolerance,
    ).length,
    missingFromInventory: records.filter(
      (rec) => rec.sourceBottles > tolerance && Math.abs(rec.inventoryAvailable) <= tolerance,
    ).length,
    extraInCatalog: records.filter((rec) => rec.sourceBottles <= tolerance && Math.abs(rec.catalogAvailable) > tolerance)
      .length,
  };

  return { records, stats };
}

function buildMarkdownReport(
  stats: ReturnType<typeof buildAuditRecords>["stats"],
  topDiscrepancies: AuditRecord[],
  dateLabel: string,
  catalogConsistency: number,
  sourcePath: string,
) {
  const issueEmoji = stats.largeDiscrepancies > stats.totalSourceSkus * 0.05 ? "🚨" : "✅";

  const keyFindings = [
    `| **Total SKUs in Well Crafted Source** | ${formatNumber(stats.totalSourceSkus)} |`,
    `| **Total SKUs in Catalog (eligible)** | ${formatNumber(stats.totalCatalogSkus)} |`,
    `| **Total SKUs in Inventory** | ${formatNumber(stats.totalInventorySkus)} |`,
    `| **SKUs with accurate translation** | ${formatNumber(stats.exactMatches)} (${formatPercent(
      stats.exactMatches / Math.max(stats.totalSourceSkus, 1),
    )}) |`,
    `| **SKUs with large discrepancies (>10 bottles)** | ${formatNumber(stats.largeDiscrepancies)} (${formatPercent(
      stats.largeDiscrepancies / Math.max(stats.totalSourceSkus, 1),
    )}) |`,
    `| **Catalog-Inventory consistency** | ${formatPercent(catalogConsistency)} |`,
  ].join("\n");

  const discrepancyTable = [
    "| SKU | WC Bottles | Catalog Available | Difference | % Error | Product |",
    "|-----|------------|-------------------|------------|---------|---------|",
    ...topDiscrepancies.map((rec) => {
      const percent =
        rec.percentError === null || !Number.isFinite(rec.percentError)
          ? "n/a"
          : `${formatNumber(rec.percentError * 100, { decimals: 1 })}%`;
      return `| **${rec.sku}** | ${formatNumber(rec.sourceBottles, { decimals: 2 })} | ${formatNumber(
        rec.catalogAvailable,
        { decimals: 2 },
      )} | **${formatNumber(rec.difference, { decimals: 2 })}** | ${percent} | ${rec.productName} |`;
    }),
  ].join("\n");

  return `# Inventory Data Comparison Report
**Date:** ${dateLabel}  
**Source File:** ${path.basename(sourcePath)}

---

## Executive Summary

**${issueEmoji} ${
    stats.largeDiscrepancies > 0 ? "Data discrepancies detected" : "Inventory alignment looks healthy"
  }.** ${stats.largeDiscrepancies} of ${stats.totalSourceSkus} SKUs (${formatPercent(
    stats.largeDiscrepancies / Math.max(stats.totalSourceSkus, 1),
  )}) differ by more than 10 bottles between Well Crafted and the CRM exports.

### Key Findings

| Metric | Value |
|--------|-------|
${keyFindings}

---

## coverage gaps

- **Missing from catalog:** ${stats.missingFromCatalog} SKUs with stock in Well Crafted do not appear in the catalog export.
- **Missing from inventory:** ${stats.missingFromInventory} SKUs have no inventory rows in the CRM export.
- **Extra catalog SKUs:** ${stats.extraInCatalog} SKUs appear in catalog but not in the Well Crafted source (legacy or mismatched codes).

---

## Critical Quantity Discrepancies

Top ${topDiscrepancies.length} SKUs with the largest delta between Well Crafted bottles and catalog availability:

${discrepancyTable}
`;
}

function writeCsvFile(outDir: string, fileName: string, headers: string[], rows: Array<Record<string, string | number>>) {
  const content = toCsv(headers, rows);
  fs.writeFileSync(path.join(outDir, fileName), content, "utf-8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = args.source ?? DEFAULT_SOURCE_PATH;
  const outDir = path.resolve(args.out ?? DEFAULT_OUT_DIR);
  const tolerance = args.tolerance ? Number(args.tolerance) : 0.5;
  const tenantId = args.tenant ?? DEFAULT_TENANT_ID;
  const dateLabel = args.date ?? new Date().toLocaleDateString("en-US");

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source CSV not found at ${sourcePath}`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  console.log("📦 Loading Well Crafted source CSV...");
  const sourceMap = await loadSourceSkus(sourcePath);
  console.log(`   → Loaded ${sourceMap.size} unique SKUs from source`);

  console.log("🗂️  Fetching CRM catalog + inventory data...");
  const dbMap = await loadDbSkus(tenantId);
  console.log(`   → Retrieved ${dbMap.size} SKUs from database`);

  console.log("🧮 Computing discrepancies...");
  const { records, stats } = buildAuditRecords(sourceMap, dbMap, tolerance);

  const sortedByDiff = [...records].sort(
    (a, b) => Math.abs(b.difference) - Math.abs(a.difference),
  );
  const topDiscrepancies = sortedByDiff.slice(0, 15);

  const catalogConsistency = stats.catalogInventoryConsistency;

  console.log("📝 Writing audit artifacts...");
  const markdown = buildMarkdownReport(stats, topDiscrepancies, dateLabel, catalogConsistency, sourcePath);
  const reportFilename = `inventory-comparison-report-${dateLabel.replace(/\//g, "-")}.md`;
  fs.writeFileSync(path.join(outDir, reportFilename), markdown, "utf-8");

  writeCsvFile(outDir, "inventory-summary-statistics.csv", ["Metric", "Value"], [
    { Metric: "Total SKUs Compared", Value: stats.totalSourceSkus },
    {
      Metric: "Exact Matches (±0.5 bottles)",
      Value: `${stats.exactMatches} (${formatPercent(stats.exactMatches / Math.max(stats.totalSourceSkus, 1))})`,
    },
    {
      Metric: "Close Matches (±2 bottles)",
      Value: `${stats.closeMatches} (${formatPercent(stats.closeMatches / Math.max(stats.totalSourceSkus, 1))})`,
    },
    {
      Metric: "Large Discrepancies (>10 bottles)",
      Value: `${stats.largeDiscrepancies} (${formatPercent(stats.largeDiscrepancies / Math.max(
        stats.totalSourceSkus,
        1,
      ))})`,
    },
  ]);

  const criticalRows = sortedByDiff
    .filter((rec) => Math.abs(rec.difference) > 10 || rec.sourceBottles === 0 || rec.catalogAvailable === 0)
    .map((rec) => ({
      SKU: rec.sku,
      "Product Name": rec.productName,
      Brand: rec.brand,
      "Well Crafted Bottles": rec.sourceBottles,
      "Catalog Available": rec.catalogAvailable,
      "Inventory Available": rec.inventoryAvailable,
      Difference: rec.difference,
      "% Error":
        rec.percentError === null || !Number.isFinite(rec.percentError)
          ? ""
          : formatNumber(rec.percentError * 100, { decimals: 2 }),
    }));
  writeCsvFile(
    outDir,
    "inventory-critical-issues.csv",
    ["SKU", "Product Name", "Brand", "Well Crafted Bottles", "Catalog Available", "Inventory Available", "Difference", "% Error"],
    criticalRows,
  );

  const missingCatalog = records
    .filter((rec) => rec.sourceBottles > tolerance && Math.abs(rec.catalogAvailable) <= tolerance)
    .map((rec) => ({
      SKU: rec.sku,
      "Product Name": rec.productName,
      Brand: rec.brand,
      "Well Crafted Bottles": rec.sourceBottles,
    }));
  writeCsvFile(outDir, "skus-missing-from-catalog.csv", ["SKU", "Product Name", "Brand", "Well Crafted Bottles"], missingCatalog);

  const missingInventory = records
    .filter((rec) => rec.sourceBottles > tolerance && Math.abs(rec.inventoryAvailable) <= tolerance)
    .map((rec) => ({
      SKU: rec.sku,
      "Product Name": rec.productName,
      Brand: rec.brand,
      "Well Crafted Bottles": rec.sourceBottles,
    }));
  writeCsvFile(
    outDir,
    "skus-missing-from-inventory.csv",
    ["SKU", "Product Name", "Brand", "Well Crafted Bottles"],
    missingInventory,
  );

  const extraCatalog = records
    .filter((rec) => rec.sourceBottles <= tolerance && Math.abs(rec.catalogAvailable) > tolerance)
    .map((rec) => ({
      SKU: rec.sku,
      "Product Name": rec.productName,
      Brand: rec.brand,
      "Catalog Available": rec.catalogAvailable,
    }));
  writeCsvFile(
    outDir,
    "catalog-skus-missing-from-source.csv",
    ["SKU", "Product Name", "Brand", "Catalog Available"],
    extraCatalog,
  );

  console.log("\n✅ Audit complete.");
  console.log(`   • Markdown report: ${path.join(outDir, reportFilename)}`);
  console.log(`   • Summary stats : ${path.join(outDir, "inventory-summary-statistics.csv")}`);
  console.log(`   • Critical CSV  : ${path.join(outDir, "inventory-critical-issues.csv")}`);
}

main()
  .catch((error) => {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
