/**
 * Create Missing SKUs from PDFs - Comprehensive Solution
 *
 * This script:
 * 1. Copies the full parser logic from import-invoices.ts
 * 2. Re-parses ALL 3,073 PDF invoices
 * 3. Extracts ALL line items with SKU codes
 * 4. Creates Product and SKU records for missing SKUs
 * 5. Handles suppliers properly
 *
 * After running this, re-run import:invoices to populate all OrderLines
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

// Type definitions
type ParsedAddress = {
  name: string | null;
  lines: string[];
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  licenseNumber?: string | null;
  customerId?: string | null;
};

type InvoiceLine = {
  description: string;
  sku?: string | null;
  code?: string | null;
  size?: string | null;
  quantityBottles?: number | null;
  quantityCases?: number | null;
  liters?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
};

type ParsedInvoice = {
  vendor: string;
  sourceFile: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  paymentTerms?: string | null;
  shipDate?: string | null;
  dueDate?: string | null;
  salesperson?: string | null;
  shippingMethod?: string | null;
  customer: ParsedAddress;
  shipTo: ParsedAddress | null;
  total?: number | null;
  portfolio?: string | null;
  items: InvoiceLine[];
};

// Abstract base class for parsers
abstract class InvoiceParser {
  abstract canParse(text: string): boolean;
  abstract parse(text: string, filePath: string): ParsedInvoice;

  protected matchSingle(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match?.[1]?.trim() ?? null;
  }

  protected parseDate(value: string | null): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toISOString();
  }

  protected parseNumber(value: string | null): number | null {
    if (!value) return null;
    const sanitized = value.replace(/[,]/g, "");
    const number = Number.parseFloat(sanitized);
    return Number.isFinite(number) ? number : null;
  }
}

// Copy WellCraftedParser from import-invoices.ts
class WellCraftedParser extends InvoiceParser {
  canParse(text: string): boolean {
    return text.includes("Well Crafted Wine & Beverage Co.") && text.includes("Customer ID:");
  }

  parse(text: string, filePath: string): ParsedInvoice {
    const invoiceNumber =
      this.matchSingle(text, /Invoice Number:\s*([0-9A-Za-z-]+)/) ??
      (() => { throw new Error(`Unable to find invoice number for ${filePath}`); })();

    const invoiceDate = this.parseDate(
      this.matchSingle(text, /Invoice Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/),
    );

    const lines = text.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) =>
      line.includes("No. bottles") && line.includes("Brand & type") && line.includes("Amount"),
    );

    const lineItems = headerIndex >= 0 ? this.parseLineItems(lines.slice(headerIndex)) : [];

    return {
      vendor: "Well Crafted Wine & Beverage Co.",
      sourceFile: filePath,
      invoiceNumber,
      invoiceDate,
      customer: { name: null, lines: [] },
      shipTo: null,
      items: lineItems,
    };
  }

  private parseLineItems(lines: string[]): InvoiceLine[] {
    const header = lines.find((line) => line.includes("No. bottles"));
    if (!header) return [];

    const boundaries = {
      quantity: header.indexOf("No. bottles"),
      size: header.indexOf("Size"),
      code: header.indexOf("Code"),
      sku: header.indexOf("SKU"),
      brand: header.indexOf("Brand & type"),
      liters: header.indexOf("Liters"),
      unitPrice: header.indexOf("Unit price"),
      amount: header.indexOf("Amount"),
    };

    const items: InvoiceLine[] = [];
    let current: InvoiceLine | null = null;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\u00a0/g, " ");
      if (line.trim().length === 0) continue;
      if (line.includes("No. bottles") && line.includes("Brand & type")) continue;
      if (/^Total\s/.test(line.trim())) break;

      const skuSegment = line.slice(boundaries.sku, boundaries.brand).trim();
      const brandSegment = line.slice(boundaries.brand, boundaries.liters).trim();
      const sizeSegment = line.slice(boundaries.size, boundaries.code).trim();

      const isNewRow = skuSegment.length > 0;

      if (isNewRow) {
        if (current) items.push(current);
        current = {
          description: brandSegment,
          sku: skuSegment || null,
          size: sizeSegment || null,
        };
        continue;
      }

      if (current && brandSegment) {
        current.description = `${current.description} ${brandSegment}`.trim();
      }
    }

    if (current) items.push(current);
    return items;
  }
}

// Copy CanopyParser from import-invoices.ts
class CanopyParser extends InvoiceParser {
  canParse(text: string): boolean {
    return text.includes("Canopy Wine Selections");
  }

  parse(text: string, filePath: string): ParsedInvoice {
    const invoiceNumber =
      this.matchSingle(text, /Invoice #:\s*([0-9A-Za-z-]+)/) ??
      (() => { throw new Error(`Unable to find invoice number for ${filePath}`); })();

    const lines = text.split(/\r?\n/);
    const headerIndex = lines.findIndex(
      (line) =>
        line.includes("Name:") &&
        line.includes("Item #:") &&
        line.includes("Cases:") &&
        line.includes("Net price USD"),
    );

    const { items } = headerIndex >= 0 ? this.parseItems(lines.slice(headerIndex)) : { items: [], total: null };

    return {
      vendor: "Canopy Wine Selections",
      sourceFile: filePath,
      invoiceNumber,
      invoiceDate: null,
      customer: { name: null, lines: [] },
      shipTo: null,
      items,
    };
  }

  private parseItems(lines: string[]): { items: InvoiceLine[]; total: number | null } {
    const header = lines.find((line) => line.includes("Item #:") && line.includes("Net price USD"));
    if (!header) return { items: [], total: null };

    const items: InvoiceLine[] = [];
    const rowPattern =
      /^\s*(.*?)\s{2,}([0-9A-Za-z'-]+)\s+([\d.]+)\s+([0-9A-Za-z x]+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,.]+)$/;

    for (const rawLine of lines.slice(2)) {
      const line = rawLine.replace(/\u00a0/g, " ").trimEnd();
      if (line.length === 0) continue;
      const trimmedStart = line.trimStart();
      if (trimmedStart.startsWith("Total:") || trimmedStart.startsWith("Certified")) break;

      const match = rowPattern.exec(line);
      if (match) {
        const [, description, sku, cases, size] = match;
        items.push({
          description: description.trim(),
          sku: sku.trim() || null,
          size: size.trim() || null,
        });
      }
    }

    return { items, total: null };
  }
}

function extractText(filePath: string): string {
  const result = spawnSync("pdftotext", ["-layout", filePath, "-"], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) return "";
  return result.stdout || "";
}

function collectPdfFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries
    .filter((entry) => extname(entry).toLowerCase() === ".pdf")
    .map((entry) => resolve(directory, entry))
    .filter((filePath) => statSync(filePath).isFile());
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--write");

  console.log("\n🔍 Extracting SKUs from all PDF invoices using full parsers...\n");

  const prisma = new PrismaClient();

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "well-crafted" },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const invoiceDir = resolve(process.cwd(), "../invoices");
    const pdfFiles = collectPdfFiles(invoiceDir);

    console.log(`Processing ${pdfFiles.length} PDF files...`);

    const parsers: InvoiceParser[] = [new WellCraftedParser(), new CanopyParser()];
    const skuMap = new Map<string, { name: string; size: string | null; count: number }>();

    let processed = 0;
    let parsed = 0;

    for (const file of pdfFiles) {
      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed}/${pdfFiles.length} files... (${parsed} parsed, ${skuMap.size} unique SKUs found)`);
      }

      try {
        const text = extractText(file);
        if (!text || text.trim().length === 0) continue;

        const parser = parsers.find((p) => p.canParse(text));
        if (!parser) continue;

        const invoice = parser.parse(text, file);
        parsed++;

        for (const item of invoice.items) {
          if (!item.sku || item.sku.trim().length === 0) continue;

          const sku = item.sku.trim();
          if (skuMap.has(sku)) {
            skuMap.get(sku)!.count += 1;
          } else {
            skuMap.set(sku, {
              name: item.description || "Unknown Product",
              size: item.size || null,
              count: 1,
            });
          }
        }
      } catch (error) {
        // Skip unparseable PDFs
      }
    }

    console.log(`\n✓ Processed ${processed} PDF files`);
    console.log(`✓ Successfully parsed ${parsed} invoices`);
    console.log(`✓ Found ${skuMap.size} unique SKUs\n`);

    // Check which SKUs already exist
    const existingSkus = await prisma.sku.findMany({
      where: {
        tenantId: tenant.id,
        code: { in: Array.from(skuMap.keys()) },
      },
      select: { code: true },
    });

    const existingSkuCodes = new Set(existingSkus.map(s => s.code));
    const missingSkus = Array.from(skuMap.entries())
      .filter(([code]) => !existingSkuCodes.has(code))
      .sort((a, b) => b[1].count - a[1].count); // Sort by frequency

    console.log(`Found ${existingSkuCodes.size} SKUs already in database`);
    console.log(`Need to create ${missingSkus.length} missing SKUs\n`);

    let created = 0;
    let productsCreated = 0;

    for (const [skuCode, skuData] of missingSkus) {
      try {
        if (!dryRun) {
          // Create or find product
          const product = await prisma.product.upsert({
            where: {
              tenantId_name: {
                tenantId: tenant.id,
                name: skuData.name,
              },
            },
            create: {
              tenantId: tenant.id,
              name: skuData.name,
              category: "Wine",
            },
            update: {},
            select: { id: true, name: true },
          });

          if (product.name === skuData.name) {
            productsCreated++;
          }

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

          console.log(`✓ Created SKU ${skuCode} - ${skuData.name.substring(0, 60)}... (used ${skuData.count} times)`);
          created++;
        } else {
          if (created < 20) { // Only show first 20 in dry run
            console.log(`[DRY RUN] Would create SKU ${skuCode} - ${skuData.name.substring(0, 60)}... (used ${skuData.count} times)`);
          }
          created++;
        }
      } catch (error) {
        console.error(`Failed to create SKU ${skuCode}: ${error}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("SKU CREATION REPORT");
    console.log("=".repeat(80));
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`Total SKUs found in PDFs: ${skuMap.size}`);
    console.log(`SKUs already exist: ${existingSkuCodes.size}`);
    console.log(`SKUs created: ${created}`);
    console.log(`Products created: ${productsCreated}`);
    console.log("=".repeat(80));

    if (dryRun) {
      console.log("\n💡 This was a DRY RUN. Run with --write to create SKUs.\n");
      console.log(`Total SKUs shown above: ${Math.min(20, created)} of ${created}`);
    } else {
      console.log("\n✅ SKU creation complete!");
      console.log("\n🔄 Next step: Re-run import to populate OrderLines");
      console.log("   npm run import:invoices -- --directory ../invoices --write\n");
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
