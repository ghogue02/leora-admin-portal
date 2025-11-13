import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";

const prisma = new PrismaClient();

const TENANT_ID = "58b8126a-2d2f-4f55-bc98-5b6784800bed";
const DEFAULT_INVENTORY_CSV = "/Users/greghogue/Leora2/Well Crafted Wine & Beverage Co. inventory as at 2025-10-29.csv";
const DEFAULT_EXPORT_CSV = "/Users/greghogue/Leora2/Export items 2025-10-29.csv";
const INVENTORY_CSV = process.env.INVENTORY_CSV ?? DEFAULT_INVENTORY_CSV;
const EXPORT_CSV = process.env.EXPORT_CSV ?? DEFAULT_EXPORT_CSV;

type InventoryRow = {
  Warehouse: string;
  Account: string;
  "Item number": string;
  "Item type": string;
  Supplier: string;
  Category: string;
  Brand: string;
  Name: string;
  Batch: string;
  SKU: string;
  Vintage: string;
  Style: string;
  Colour: string;
  Varieties: string;
  Cases: string;
  "Items per case": string;
  "Unit quantity": string;
  Unit: string;
  "Barrel or tank": string;
  Liters: string;
  "Unit COGS": string;
  COGS: string;
  "Pending orders (cases)": string;
  "Pending orders (unit quantity)": string;
  "Pending goods received (cases)": string;
  "Pending goods received (unit quantity)": string;
  "Warehouse Location": string;
};

type ExportRow = {
  Account: string;
  Item: string;
  "Item number": string;
  SKU: string;
  Manufacturer: string;
  Supplier: string;
  "Label alcohol": string;
  "Units per item": string;
  Unit: string;
  "Items per case": string;
  "Total quantity": string;
  "Barcode (Bottle)": string;
  "Barcode (Case)": string;
  "MOCO Item Number": string;
  "Virginia ABC Code": string;
  "Warehouse Location": string;
};

type AggregatedLocation = {
  warehouse: string;
  units: number;
  binLocation: string | null;
  sampleRow: InventoryRow;
};

type AggregatedInventory = {
  sku: string;
  sampleRow: InventoryRow;
  locations: AggregatedLocation[];
};

function parseNumeric(value?: string | null) {
  if (!value) return 0;
  const sanitized = value.replace(/,/g, "");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateUnits(row: InventoryRow) {
  const unitQty = parseNumeric(row["Unit quantity"]);
  if (unitQty > 0) {
    return unitQty;
  }
  const cases = parseNumeric(row.Cases);
  const itemsPerCase = parseNumeric(row["Items per case"]);
  return cases * (itemsPerCase || 12);
}

async function main() {
  console.log("🚀 Starting Inventory Enrichment Sync");
  console.log("=".repeat(80));

  // Parse inventory CSV
  console.log("\n📄 Step 1: Parsing Inventory CSV...");
  console.log(`   → File: ${INVENTORY_CSV}`);
  const inventoryContent = stripExcelPrefixes(fs.readFileSync(INVENTORY_CSV, "utf-8"));
  const inventoryRecords = parse(inventoryContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as InventoryRow[];

  const validInventory = inventoryRecords.filter((r) => r.SKU && r.SKU.trim().length > 0);
  console.log(`✅ Parsed ${inventoryRecords.length} inventory rows`);
  console.log(`✅ Valid records with SKUs: ${validInventory.length}`);

  // Parse export CSV
  console.log("\n📄 Step 2: Parsing Export Items CSV...");
  console.log(`   → File: ${EXPORT_CSV}`);
  const exportContent = stripExcelPrefixes(fs.readFileSync(EXPORT_CSV, "utf-8"));
  const exportRecords = parse(exportContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ExportRow[];

  const validExport = exportRecords.filter((r) => r.SKU && r.SKU.trim().length > 0);
  console.log(`✅ Parsed ${exportRecords.length} export rows`);
  console.log(`✅ Valid records with SKUs: ${validExport.length}`);

  // Create lookup maps
  const inventoryMap = new Map<string, AggregatedInventory>();
  for (const record of validInventory) {
    const skuCode = record.SKU.trim();
    const warehouse = record.Warehouse?.trim() || "Main";
    const units = calculateUnits(record);

    const existing = inventoryMap.get(skuCode) ?? {
      sku: skuCode,
      sampleRow: record,
      locations: [],
    };

    const location = existing.locations.find((loc) => loc.warehouse === warehouse);
    if (location) {
      location.units += units;
      location.sampleRow = record;
      location.binLocation = record["Warehouse Location"]?.trim() || null;
    } else {
      existing.locations.push({
        warehouse,
        units,
        sampleRow: record,
        binLocation: record["Warehouse Location"]?.trim() || null,
      });
    }

    existing.sampleRow = existing.sampleRow || record;
    inventoryMap.set(skuCode, existing);
  }
  const exportMap = new Map(validExport.map((r) => [r.SKU.trim(), r]));

  console.log(`\n📊 Step 3: Analyzing data...`);
  console.log(`   - Unique SKUs in inventory CSV: ${inventoryMap.size}`);
  console.log(`   - Unique SKUs in export CSV: ${exportMap.size}`);

  // Step 4: Enrich Products and SKUs
  console.log(`\n🔧 Step 4: Enriching products with wine details...`);

  let productsEnriched = 0;
  let skusEnriched = 0;
  let inventoryUpdated = 0;
  let errors = 0;

  const allSkus = await prisma.sku.findMany({
    where: {
      tenantId: TENANT_ID,
      isActive: true,
    },
    include: {
      product: true,
    },
  });

  console.log(`✅ Found ${allSkus.length} active SKUs in database`);

  for (const sku of allSkus) {
    const aggregate = inventoryMap.get(sku.code);
    const invData = aggregate?.sampleRow;
    const expData = exportMap.get(sku.code);

    if (!invData && !expData) {
      continue; // No data for this SKU
    }

    try {
      // Update Product with wine details
      if (invData) {
        const updates: any = {};

        if (invData.Vintage && !isNaN(parseInt(invData.Vintage))) {
          updates.vintage = parseInt(invData.Vintage);
        }

        if (invData.Colour) {
          updates.colour = invData.Colour.trim();
        }

        if (invData.Varieties) {
          updates.varieties = invData.Varieties.trim();
        }

        if (invData.Style) {
          updates.style = invData.Style.trim();
        }

        if (invData["Unit COGS"]) {
          const cogs = parseFloat(invData["Unit COGS"].replace(/[$,]/g, ""));
          if (!isNaN(cogs)) {
            updates.unitCogs = cogs;
          }
        }

        if (expData?.Manufacturer) {
          updates.manufacturer = expData.Manufacturer.trim();
        }

        if (expData?.["Virginia ABC Code"]) {
          updates.abcCode = expData["Virginia ABC Code"].trim();
        }

        if (expData?.["MOCO Item Number"]) {
          updates.mocoNumber = expData["MOCO Item Number"].trim();
        }

        if (Object.keys(updates).length > 0) {
          await prisma.product.update({
            where: { id: sku.product.id },
            data: updates,
          });
          productsEnriched++;
        }
      }

      // Update SKU with packaging details
      const skuUpdates: any = {};

      if (invData?.["Items per case"] && !isNaN(parseInt(invData["Items per case"]))) {
        skuUpdates.itemsPerCase = parseInt(invData["Items per case"]);
      }

      if (invData?.Liters) {
        const liters = parseFloat(invData.Liters);
        if (!isNaN(liters)) {
          skuUpdates.liters = liters;
        }
      }

      if (invData?.Batch) {
        skuUpdates.batchNumber = invData.Batch.trim();
      }

      if (invData?.["Barrel or tank"]) {
        skuUpdates.barrelOrTank = invData["Barrel or tank"].trim();
      }

      if (invData?.["Pending orders (unit quantity)"]) {
        const pending = parseInt(invData["Pending orders (unit quantity)"]);
        if (!isNaN(pending)) {
          skuUpdates.pendingOrders = pending;
        }
      }

      if (invData?.["Pending goods received (unit quantity)"]) {
        const pending = parseInt(invData["Pending goods received (unit quantity)"]);
        if (!isNaN(pending)) {
          skuUpdates.pendingReceiving = pending;
        }
      }

      if (expData?.["Barcode (Bottle)"]) {
        skuUpdates.bottleBarcode = expData["Barcode (Bottle)"].trim();
      }

      if (expData?.["Barcode (Case)"]) {
        skuUpdates.caseBarcode = expData["Barcode (Case)"].trim();
      }

      if (expData?.["Label alcohol"]) {
        const abv = parseFloat(expData["Label alcohol"]);
        if (!isNaN(abv) && abv > 0) {
          skuUpdates.abv = abv;
        }
      }

      if (Object.keys(skuUpdates).length > 0) {
        await prisma.sku.update({
          where: { id: sku.id },
          data: skuUpdates,
        });
        skusEnriched++;
      }

      // Update Inventory
      if (aggregate) {
        for (const location of aggregate.locations) {
          const totalOnHand = Math.max(0, Math.round(location.units));
          const warehouse = location.warehouse;
          const binLoc = location.binLocation;

          await prisma.inventory.upsert({
            where: {
              tenantId_skuId_location: {
                tenantId: TENANT_ID,
                skuId: sku.id,
                location: warehouse,
              },
            },
            create: {
              tenantId: TENANT_ID,
              skuId: sku.id,
              location: warehouse,
              onHand: totalOnHand,
              allocated: 0,
              binLocation: binLoc,
            },
            update: {
              onHand: totalOnHand,
              binLocation: binLoc,
            },
          });
          inventoryUpdated++;
        }
      }

      if ((productsEnriched + skusEnriched) % 100 === 0) {
        console.log(`   Progress: ${productsEnriched + skusEnriched}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing SKU ${sku.code}: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Enrichment complete:`);
  console.log(`   - Products enriched: ${productsEnriched}`);
  console.log(`   - SKUs enriched: ${skusEnriched}`);
  console.log(`   - Inventory records updated: ${inventoryUpdated}`);
  console.log(`   - Errors: ${errors}`);

  // Final validation
  console.log(`\n📊 Final validation...`);
  const [productsWithVintage, productsWithColour, skusWithBarcodes] = await Promise.all([
    prisma.product.count({
      where: {
        tenantId: TENANT_ID,
        vintage: { not: null },
      },
    }),
    prisma.product.count({
      where: {
        tenantId: TENANT_ID,
        colour: { not: null },
      },
    }),
    prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        bottleBarcode: { not: null },
      },
    }),
  ]);

  console.log(`\n✅ Enriched Data Summary:`);
  console.log(`   - Products with vintage: ${productsWithVintage}`);
  console.log(`   - Products with colour: ${productsWithColour}`);
  console.log(`   - SKUs with barcodes: ${skusWithBarcodes}`);

  console.log("\n🎉 Inventory enrichment completed successfully!");
  console.log("=".repeat(80));
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

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
