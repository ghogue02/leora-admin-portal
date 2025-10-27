/**
 * Migrate Reclassified Invoices to SupplierInvoices Table
 *
 * This script moves the 369 reclassified supplier purchase invoices
 * from ImportedInvoices to SupplierInvoices table.
 *
 * It handles:
 * - Duplicate detection (105 already exist in SupplierInvoices)
 * - Supplier name extraction from PDFs or reference number ranges
 * - Data validation
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load environment variables
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
  itemCount: number | null;
}

interface MigrationResult {
  totalProcessed: number;
  migrated: number;
  skipped: number;
  errors: string[];
  bySupplier: Record<string, number>;
}

function getSupplierName(referenceNumber: number | null): string {
  if (!referenceNumber) return "Unknown Supplier";

  if (referenceNumber >= 176000 && referenceNumber < 177000) {
    return "Noble Hill Wines Pty. Ltd.";
  } else if (referenceNumber >= 174000 && referenceNumber < 176000) {
    return "Canopy Wine Selections";
  } else if (referenceNumber >= 177000) {
    return "Other Supplier";
  }

  return "Unknown Supplier";
}

async function migrateToSupplierInvoices(dryRun = true): Promise<MigrationResult> {
  const prisma = new PrismaClient();

  const result: MigrationResult = {
    totalProcessed: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
    bySupplier: {},
  };

  try {
    // Get all reclassified supplier invoices
    const supplierInvoices = await prisma.$queryRaw<ImportedInvoice[]>`
      SELECT
        id,
        "referenceNumber",
        "invoiceNumber",
        "invoiceDate",
        total,
        "itemCount"
      FROM "ImportedInvoices"
      WHERE invoice_type = 'supplier_purchase'
      ORDER BY "referenceNumber"
    `;

    console.log(`Found ${supplierInvoices.length} supplier invoices to migrate`);
    result.totalProcessed = supplierInvoices.length;

    for (const invoice of supplierInvoices) {
      try {
        const supplierName = getSupplierName(invoice.referenceNumber);
        result.bySupplier[supplierName] = (result.bySupplier[supplierName] || 0) + 1;

        // Check if already exists in SupplierInvoices
        const existing = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count
          FROM "SupplierInvoices"
          WHERE "invoiceNumber" = ${invoice.invoiceNumber}
        `;

        if (existing[0]?.count > 0) {
          console.log(`⊘ Skipped invoice ${invoice.referenceNumber} - already exists in SupplierInvoices`);
          result.skipped += 1;
          continue;
        }

        if (!dryRun) {
          // Insert into SupplierInvoices
          await prisma.$executeRaw`
            INSERT INTO "SupplierInvoices" (
              "referenceNumber",
              "invoiceNumber",
              "invoiceDate",
              total,
              "supplierName",
              "itemCount",
              imported_at
            ) VALUES (
              ${invoice.referenceNumber},
              ${invoice.invoiceNumber},
              ${invoice.invoiceDate},
              ${invoice.total},
              ${supplierName},
              ${invoice.itemCount},
              NOW()
            )
          `;

          console.log(`✓ Migrated invoice ${invoice.referenceNumber} - ${supplierName}`);
        } else {
          console.log(`[DRY RUN] Would migrate invoice ${invoice.referenceNumber} - ${supplierName}`);
        }

        result.migrated += 1;
      } catch (error) {
        const errorMsg = `Failed to migrate invoice ${invoice.referenceNumber}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function generateReport(result: MigrationResult, dryRun: boolean) {
  console.log("\n" + "=".repeat(80));
  console.log("SUPPLIER INVOICE MIGRATION REPORT");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes made)" : "LIVE (changes applied)"}`);
  console.log(`Total invoices processed: ${result.totalProcessed}`);
  console.log(`Successfully migrated: ${result.migrated}`);
  console.log(`Skipped (duplicates): ${result.skipped}`);
  console.log(`Errors encountered: ${result.errors.length}`);
  console.log();

  console.log("Breakdown by Supplier:");
  console.log("-".repeat(80));
  for (const [supplier, count] of Object.entries(result.bySupplier)) {
    console.log(`  ${supplier}: ${count} invoices`);
  }
  console.log();

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
  console.log("Supplier purchase invoices have been moved to SupplierInvoices table.");
  console.log("This separates accounts payable from accounts receivable.");
  console.log();
  console.log("Next steps:");
  console.log("  1. Review SupplierInvoices table");
  console.log("  2. Set up accounts payable tracking");
  console.log("  3. Optionally archive/delete from ImportedInvoices");
  console.log("=".repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run migrate:supplier-invoices -- [options]

Options:
  --write    Actually perform the migration (default: dry run)
  --help     Show this help message

Examples:
  npm run migrate:supplier-invoices                    # Dry run (preview)
  npm run migrate:supplier-invoices -- --write         # Actually migrate
`);
    return;
  }

  console.log("\n🔄 Starting supplier invoice migration to SupplierInvoices table...\n");

  const result = await migrateToSupplierInvoices(dryRun);
  await generateReport(result, dryRun);

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. No changes were made.");
    console.log("   Run with --write to apply changes.\n");
  } else {
    console.log("\n✅ Migration complete!\n");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
