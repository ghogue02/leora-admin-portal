/**
 * Re-classify Supplier Invoices Script
 *
 * This script re-classifies the 369 misclassified "customer_sale" invoices
 * that are actually supplier purchase invoices or credit notes.
 *
 * Uses raw SQL since ImportedInvoices table is not in Prisma schema.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load environment variables from .env.local
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const contents = readFileSync(envPath, "utf8");
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .forEach((line) => {
        const [key, ...rest] = line.split("=");
        if (!key) return;
        const value = rest.join("=").trim().replace(/^"|"$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
  }
}

loadEnv();

interface ImportedInvoice {
  id: number;
  referenceNumber: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  total: number | null;
  invoice_type: string | null;
  migrated_to_production: boolean | null;
}

interface ReclassificationResult {
  totalProcessed: number;
  reclassified: number;
  errors: string[];
  byVendor: Record<string, number>;
  highValueInvoices: Array<{
    referenceNumber: number;
    total: number;
    invoiceDate: string | null;
  }>;
}

async function reclassifySupplierInvoices(dryRun = true): Promise<ReclassificationResult> {
  const prisma = new PrismaClient();

  const result: ReclassificationResult = {
    totalProcessed: 0,
    reclassified: 0,
    errors: [],
    byVendor: {},
    highValueInvoices: [],
  };

  try {
    // Find all unmigrated "customer_sale" invoices using raw SQL
    const misclassified = await prisma.$queryRaw<ImportedInvoice[]>`
      SELECT
        id,
        "referenceNumber",
        "invoiceNumber",
        "invoiceDate",
        total,
        invoice_type,
        migrated_to_production
      FROM "ImportedInvoices"
      WHERE invoice_type = 'customer_sale'
        AND (migrated_to_production = false OR migrated_to_production IS NULL)
      ORDER BY total DESC NULLS LAST
    `;

    console.log(`Found ${misclassified.length} misclassified invoices`);
    result.totalProcessed = misclassified.length;

    // Track high-value invoices for reporting
    result.highValueInvoices = misclassified
      .filter((inv) => inv.total && inv.total > 100000)
      .map((inv) => ({
        referenceNumber: inv.referenceNumber ?? 0,
        total: Number(inv.total),
        invoiceDate: inv.invoiceDate,
      }));

    for (const invoice of misclassified) {
      try {
        // Determine vendor from reference number ranges
        const refNum = invoice.referenceNumber ?? 0;
        let vendor = "Unknown";

        if (refNum >= 176000 && refNum < 177000) {
          vendor = "Noble Hill Wines";
        } else if (refNum >= 174000 && refNum < 176000) {
          vendor = "Canopy Wine Selections";
        } else if (refNum >= 177000) {
          vendor = "Other Supplier";
        }

        result.byVendor[vendor] = (result.byVendor[vendor] || 0) + 1;

        if (!dryRun) {
          // Update the invoice_type to supplier_purchase
          await prisma.$executeRaw`
            UPDATE "ImportedInvoices"
            SET invoice_type = 'supplier_purchase'
            WHERE id = ${invoice.id}
          `;

          console.log(
            `✓ Reclassified invoice ${invoice.referenceNumber} ($${invoice.total}) - ${vendor}`
          );
        } else {
          console.log(
            `[DRY RUN] Would reclassify invoice ${invoice.referenceNumber} ($${invoice.total}) - ${vendor}`
          );
        }

        result.reclassified += 1;
      } catch (error) {
        const errorMsg = `Failed to process invoice ${invoice.referenceNumber}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function generateReport(result: ReclassificationResult, dryRun: boolean) {
  console.log("\n" + "=".repeat(80));
  console.log("SUPPLIER INVOICE RECLASSIFICATION REPORT");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes made)" : "LIVE (changes applied)"}`);
  console.log(`Total invoices processed: ${result.totalProcessed}`);
  console.log(`Successfully reclassified: ${result.reclassified}`);
  console.log(`Errors encountered: ${result.errors.length}`);
  console.log();

  console.log("Breakdown by Vendor:");
  console.log("-".repeat(80));
  for (const [vendor, count] of Object.entries(result.byVendor)) {
    console.log(`  ${vendor}: ${count} invoices`);
  }
  console.log();

  if (result.highValueInvoices.length > 0) {
    console.log("High-Value Invoices (>$100K):");
    console.log("-".repeat(80));
    for (const invoice of result.highValueInvoices) {
      console.log(
        `  Invoice #${invoice.referenceNumber}: $${invoice.total.toLocaleString()} (${invoice.invoiceDate})`
      );
    }
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("Errors:");
    console.log("-".repeat(80));
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
    console.log();
  }

  console.log("Summary:");
  console.log("-".repeat(80));
  console.log("These invoices represent purchases FROM suppliers (accounts payable).");
  console.log("They were misclassified as customer sales during the initial import.");
  console.log();
  console.log("Next steps:");
  console.log("  1. Review the reclassified invoices");
  console.log("  2. Consider moving to a separate SupplierInvoices table");
  console.log("  3. Update accounting reports to reflect correct categorization");
  console.log("=".repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run reclassify:suppliers -- [options]

Options:
  --write    Actually perform the reclassification (default: dry run)
  --help     Show this help message

Examples:
  npm run reclassify:suppliers                    # Dry run (preview changes)
  npm run reclassify:suppliers -- --write         # Actually make changes
`);
    return;
  }

  console.log("\n🔍 Starting supplier invoice reclassification...\n");

  const result = await reclassifySupplierInvoices(dryRun);
  await generateReport(result, dryRun);

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. No changes were made.");
    console.log("   Run with --write to apply changes.\n");
  } else {
    console.log("\n✅ Reclassification complete!\n");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
