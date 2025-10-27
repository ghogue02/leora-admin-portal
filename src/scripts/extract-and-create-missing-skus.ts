/**
 * Extract and Create Missing SKUs
 *
 * This script extracts all missing SKU codes from PDFs and creates them in the database.
 *
 * Process:
 * 1. Re-parse all PDF invoices
 * 2. Extract line items with SKU codes
 * 3. Check which SKUs don't exist in database
 * 4. Create missing SKU records with product info
 * 5. Generate report of created SKUs
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

// Load environment
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

interface SkuToCreate {
  code: string;
  productName: string;
  size?: string;
  count: number; // How many times it appears in invoices
}

interface CreationResult {
  totalSkusFound: number;
  skusAlreadyExist: number;
  skusCreated: number;
  productsCreated: number;
  errors: string[];
}

function extractText(filePath: string): string {
  const result = spawnSync("pdftotext", ["-layout", filePath, "-"], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return "";
  }
  return result.stdout || "";
}

function extractSkusFromPdf(text: string): Array<{ sku: string; productName: string; size?: string }> {
  const skus: Array<{ sku: string; productName: string; size?: string }> = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match patterns like "Product Name  SKU123  quantity  price"
    // This is a simplified pattern - adjust based on your actual PDF format
    const skuMatch = line.match(/\b([A-Z]{3}\d{4})\b/); // Matches SKU format like SAF1015, CAL1240

    if (skuMatch) {
      const sku = skuMatch[1];
      // Extract product name (usually before the SKU)
      const productName = line.substring(0, skuMatch.index).trim() || "Unknown Product";

      // Try to extract size
      const sizeMatch = line.match(/(\d+x?\d*\s*ml|750\s*ml|1\.5\s*l|3\s*l|20\s*l)/i);
      const size = sizeMatch ? sizeMatch[1] : undefined;

      skus.push({ sku, productName, size });
    }
  }

  return skus;
}

function collectPdfFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries
    .filter((entry) => extname(entry).toLowerCase() === ".pdf")
    .map((entry) => resolve(directory, entry))
    .filter((filePath) => statSync(filePath).isFile());
}

async function extractAndCreateMissingSkus(dryRun = true): Promise<CreationResult> {
  const prisma = new PrismaClient();

  const result: CreationResult = {
    totalSkusFound: 0,
    skusAlreadyExist: 0,
    skusCreated: 0,
    productsCreated: 0,
    errors: [],
  };

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "well-crafted" },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Collect all PDFs
    const invoiceDir = resolve(process.cwd(), "../invoices");
    const pdfFiles = collectPdfFiles(invoiceDir);

    console.log(`Scanning ${pdfFiles.length} PDF files for SKUs...`);

    // Track all SKUs found
    const skuMap = new Map<string, SkuToCreate>();

    // Extract SKUs from all PDFs
    for (const pdf of pdfFiles) {
      try {
        const text = extractText(pdf);
        const skus = extractSkusFromPdf(text);

        for (const { sku, productName, size } of skus) {
          if (skuMap.has(sku)) {
            skuMap.get(sku)!.count += 1;
          } else {
            skuMap.set(sku, {
              code: sku,
              productName,
              size,
              count: 1,
            });
          }
        }
      } catch (error) {
        // Skip PDFs that can't be parsed
      }
    }

    result.totalSkusFound = skuMap.size;
    console.log(`\nFound ${skuMap.size} unique SKUs in PDFs`);

    // Check which SKUs already exist
    const existingSkus = await prisma.sku.findMany({
      where: {
        tenantId: tenant.id,
        code: { in: Array.from(skuMap.keys()) },
      },
      select: { code: true },
    });

    const existingSkuCodes = new Set(existingSkus.map(s => s.code));
    result.skusAlreadyExist = existingSkuCodes.size;

    console.log(`${existingSkuCodes.size} SKUs already exist`);
    console.log(`${skuMap.size - existingSkuCodes.size} SKUs need to be created\n`);

    // Create missing SKUs
    for (const [skuCode, skuData] of skuMap.entries()) {
      if (existingSkuCodes.has(skuCode)) {
        continue; // Skip existing SKUs
      }

      try {
        if (!dryRun) {
          // Create product first
          const product = await prisma.product.upsert({
            where: {
              tenantId_name: {
                tenantId: tenant.id,
                name: skuData.productName,
              },
            },
            create: {
              tenantId: tenant.id,
              name: skuData.productName,
              category: "Wine", // Default category
            },
            update: {},
            select: { id: true },
          });

          // Create SKU
          await prisma.sku.create({
            data: {
              tenantId: tenant.id,
              productId: product.id,
              code: skuCode,
              size: skuData.size || "750 ml",
              unitOfMeasure: "bottle",
              isActive: true,
            },
          });

          console.log(`✓ Created SKU ${skuCode} - ${skuData.productName}`);
          result.skusCreated += 1;
        } else {
          console.log(`[DRY RUN] Would create SKU ${skuCode} - ${skuData.productName} (used ${skuData.count} times)`);
          result.skusCreated += 1;
        }
      } catch (error) {
        const errorMsg = `Failed to create SKU ${skuCode}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

  } finally {
    await prisma.$disconnect();
  }

  return result;
}

async function generateReport(result: CreationResult, dryRun: boolean) {
  console.log("\n" + "=".repeat(80));
  console.log("MISSING SKU CREATION REPORT");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Total unique SKUs found in PDFs: ${result.totalSkusFound}`);
  console.log(`SKUs already in database: ${result.skusAlreadyExist}`);
  console.log(`SKUs created: ${result.skusCreated}`);
  console.log(`Products created: ${result.productsCreated}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log("=".repeat(80));

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach(err => console.log(`  ${err}`));
  }

  console.log("\nNext steps:");
  console.log("  1. Review created SKUs");
  console.log("  2. Run invoice import again: npm run import:invoices -- --directory ../invoices --write");
  console.log("  3. Verify OrderLines are created");
  console.log("  4. Check revenue displays correctly in UI");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run create:missing-skus -- [options]

Options:
  --write    Actually create SKU records (default: dry run)
  --help     Show this help message

Examples:
  npm run create:missing-skus                     # Dry run
  npm run create:missing-skus -- --write          # Create SKUs
`);
    return;
  }

  console.log("\n🔍 Extracting SKUs from PDF invoices...\n");

  const result = await extractAndCreateMissingSkus(dryRun);
  await generateReport(result, dryRun);

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. Run with --write to create SKUs.\n");
  } else {
    console.log("\n✅ SKU creation complete!\n");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
