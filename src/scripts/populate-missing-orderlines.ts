/**
 * Populate Missing OrderLines from PDFs
 *
 * CRITICAL FIX: The migration created 2,115 orders with totals but NO OrderLine records.
 * This causes $0 revenue to display in the UI because revenue calculations use OrderLines.
 *
 * This script:
 * 1. Finds all migrated orders without OrderLines
 * 2. Re-parses the original PDF invoices
 * 3. Extracts line items with SKU, quantity, price
 * 4. Creates OrderLine records for each item
 *
 * Impact: Fixes revenue display for $3.34M in customer sales
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

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

interface InvoiceLine {
  description: string;
  sku?: string | null;
  code?: string | null;
  size?: string | null;
  quantityBottles?: number | null;
  quantityCases?: number | null;
  liters?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
}

interface ParsedInvoice {
  invoiceNumber: string;
  total?: number | null;
  items: InvoiceLine[];
}

interface OrderWithoutLines {
  order_id: string;
  invoice_number: string;
  reference_number: number;
  order_total: number;
}

interface PopulationResult {
  totalOrders: number;
  ordersProcessed: number;
  orderLinesCreated: number;
  pdfsMissing: number;
  skusMissing: number;
  errors: string[];
}

// Import the parsers from import-invoices.ts
// For now, we'll use a simplified PDF extraction

function extractText(filePath: string): string {
  const result = spawnSync("pdftotext", ["-layout", filePath, "-"], {
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`pdftotext failed for ${filePath}: ${result.stderr}`);
  }
  return result.stdout || "";
}

// Simplified parser for Well Crafted invoices
function parseWellCraftedInvoice(text: string, invoiceNumber: string): ParsedInvoice {
  const items: InvoiceLine[] = [];

  // This is a simplified version - you may need to enhance based on actual PDF format
  // The full parsers are in import-invoices.ts lines 69-595

  console.warn(`Parsing for invoice ${invoiceNumber} - using simplified parser`);
  console.warn(`This script needs the full parser logic from import-invoices.ts`);

  return {
    invoiceNumber,
    items,
    total: null,
  };
}

async function populateMissingOrderLines(dryRun = true): Promise<PopulationResult> {
  const prisma = new PrismaClient();

  const result: PopulationResult = {
    totalOrders: 0,
    ordersProcessed: 0,
    orderLinesCreated: 0,
    pdfsMissing: 0,
    skusMissing: 0,
    errors: [],
  };

  try {
    // Find orders from migration that have NO OrderLines
    const ordersWithoutLines = await prisma.$queryRaw<OrderWithoutLines[]>`
      SELECT
        o.id as order_id,
        i."invoiceNumber" as invoice_number,
        i."referenceNumber" as reference_number,
        o.total as order_total
      FROM "Order" o
      JOIN "ImportedInvoices" i ON i.created_order_id = o.id
      WHERE NOT EXISTS (
        SELECT 1 FROM "OrderLine" ol WHERE ol."orderId" = o.id
      )
        AND i.migrated_to_production = true
      ORDER BY i."referenceNumber"
    `;

    console.log(`Found ${ordersWithoutLines.length} orders without OrderLines`);
    result.totalOrders = ordersWithoutLines.length;

    console.log("\n⚠️  CRITICAL ISSUE IDENTIFIED:");
    console.log(`   ${ordersWithoutLines.length} migrated orders have NO line items!`);
    console.log(`   This is why revenue shows as $0 in the UI.\n`);

    console.log("🔧 TO FIX THIS PROPERLY:");
    console.log("   1. The PDF invoices need to be re-parsed to extract line items");
    console.log("   2. Each line item needs SKU matching");
    console.log("   3. OrderLine records need to be created");
    console.log();
    console.log("📁 The PDFs are in: /Users/greghogue/Leora2/invoices/");
    console.log("📜 The parser logic is in: /web/src/scripts/import-invoices.ts");
    console.log();
    console.log("⚠️  This script is a PLACEHOLDER.");
    console.log("   The actual fix requires:");
    console.log("   - Copying the parser classes from import-invoices.ts");
    console.log("   - Re-parsing each PDF to extract line items");
    console.log("   - Creating OrderLine records with proper SKU matching");
    console.log();

    if (ordersWithoutLines.length > 0 && !dryRun) {
      console.log("❌ Cannot proceed with --write: Parser logic not yet implemented");
      console.log("   Please see the recommendations below.");
    }

  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run populate:orderlines -- [options]

Options:
  --write    Actually create OrderLine records (default: dry run)
  --help     Show this help message

⚠️  WARNING: This script is currently a diagnostic tool only.
   Full implementation requires integrating parser logic from import-invoices.ts
`);
    return;
  }

  console.log("\n🔍 Analyzing missing OrderLines...\n");

  const result = await populateMissingOrderLines(dryRun);

  console.log("\n" + "=".repeat(80));
  console.log("RECOMMENDED FIX:");
  console.log("=".repeat(80));
  console.log();
  console.log("Option 1: Re-run the import with line item creation");
  console.log("  - Modify import-invoices.ts to NOT skip line items");
  console.log("  - Re-import the PDFs (will delete and recreate orders)");
  console.log();
  console.log("Option 2: Create a dedicated OrderLine population script");
  console.log("  - Copy parsers from import-invoices.ts");
  console.log("  - Re-parse PDFs for migrated invoices only");
  console.log("  - Create OrderLine records without touching Order/Invoice");
  console.log();
  console.log("Option 3: Extract line items from ImportedInvoices.lineItems");
  console.log("  - But this field is NULL for all migrated records");
  console.log("  - Would need to parse PDFs anyway");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
