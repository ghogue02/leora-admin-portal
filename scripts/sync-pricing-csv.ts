import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const TENANT_ID = "58b8126a-2d2f-4f55-bc98-5b6784800bed"; // well-crafted
const CSV_PATH = "/Users/greghogue/Leora2/Pricing Single Source - Pricing Single Source.csv";

type CSVRow = {
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

async function main() {
  console.log("🚀 Starting Wine Product Database Sync");
  console.log("=" .repeat(80));

  // Step 1: Parse CSV
  console.log("\n📄 Step 1: Parsing CSV file...");
  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  // Filter out rows with missing SKUs
  const validRecords = records.filter((r) => r.SKU && r.SKU.trim().length > 0);

  console.log(`✅ Parsed ${records.length} total rows`);
  console.log(`✅ Valid records with SKUs: ${validRecords.length}`);
  console.log(`⚠️  Skipped ${records.length - validRecords.length} rows with missing SKUs`);

  const csvSkuCodes = new Set(validRecords.map((r) => r.SKU.trim()));
  console.log(`✅ Unique SKU codes in CSV: ${csvSkuCodes.size}`);

  // Step 2: Analyze current database
  console.log("\n📊 Step 2: Analyzing current database...");

  const [currentSkus, skusWithOrders] = await Promise.all([
    prisma.sku.findMany({
      where: { tenantId: TENANT_ID },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.orderLine.groupBy({
      by: ["skuId"],
      where: {
        sku: {
          tenantId: TENANT_ID,
        },
      },
      _count: { id: true },
    }),
  ]);

  const skuIdsWithOrders = new Set(skusWithOrders.map((o) => o.skuId));

  console.log(`📦 Current database stats:`);
  console.log(`   - Total SKUs: ${currentSkus.length}`);
  console.log(`   - SKUs with order history: ${skuIdsWithOrders.size}`);

  // Step 3: Categorize SKUs
  const skusToKeep: typeof currentSkus = [];
  const skusToDeactivate: typeof currentSkus = [];
  const skusToDelete: typeof currentSkus = [];

  for (const sku of currentSkus) {
    const inCSV = csvSkuCodes.has(sku.code);
    const hasOrders = skuIdsWithOrders.has(sku.id);

    if (inCSV) {
      skusToKeep.push(sku);
    } else if (hasOrders) {
      skusToDeactivate.push(sku);
    } else {
      skusToDelete.push(sku);
    }
  }

  console.log(`\n🔍 Step 3: Categorization complete:`);
  console.log(`   ✅ SKUs to keep (in CSV): ${skusToKeep.length}`);
  console.log(`   ⚠️  SKUs to deactivate (have orders, not in CSV): ${skusToDeactivate.length}`);
  console.log(`   ❌ SKUs to delete (no orders, not in CSV): ${skusToDelete.length}`);

  // Find new SKUs from CSV
  const existingCodes = new Set(currentSkus.map((s) => s.code));
  const newSkuCodes = Array.from(csvSkuCodes).filter((code) => !existingCodes.has(code));

  console.log(`   ➕ New SKUs to add from CSV: ${newSkuCodes.length}`);

  // Step 4: Execute sync
  console.log(`\n🔧 Step 4: Executing sync...`);

  // 4.1 Deactivate SKUs with order history
  if (skusToDeactivate.length > 0) {
    console.log(`\n⚠️  Deactivating ${skusToDeactivate.length} SKUs (preserving order history)...`);
    const deactivated = await prisma.sku.updateMany({
      where: {
        id: { in: skusToDeactivate.map((s) => s.id) },
      },
      data: {
        isActive: false,
      },
    });
    console.log(`✅ Deactivated ${deactivated.count} SKUs`);
  }

  // 4.2 Delete SKUs with no dependencies
  if (skusToDelete.length > 0) {
    console.log(`\n❌ Deleting ${skusToDelete.length} SKUs (no order history)...`);

    // Delete associated price list items first
    await prisma.priceListItem.deleteMany({
      where: {
        skuId: { in: skusToDelete.map((s) => s.id) },
      },
    });

    // Delete inventory records
    await prisma.inventory.deleteMany({
      where: {
        skuId: { in: skusToDelete.map((s) => s.id) },
      },
    });

    // Delete SKUs
    const deleted = await prisma.sku.deleteMany({
      where: {
        id: { in: skusToDelete.map((s) => s.id) },
      },
    });
    console.log(`✅ Deleted ${deleted.count} SKUs`);
  }

  // 4.3 Delete orphaned products (Product table doesn't have isActive field)
  console.log(`\n🧹 Deleting orphaned products (no active SKUs)...`);
  const orphanedProducts = await prisma.product.findMany({
    where: {
      tenantId: TENANT_ID,
      NOT: {
        skus: {
          some: {
            isActive: true,
          },
        },
      },
    },
    select: { id: true },
  });

  if (orphanedProducts.length > 0) {
    await prisma.product.deleteMany({
      where: {
        id: { in: orphanedProducts.map(p => p.id) },
      },
    });
    console.log(`✅ Deleted ${orphanedProducts.length} orphaned products`);
  } else {
    console.log(`✅ No orphaned products to delete`);
  }

  // 4.4 Add/Update products and SKUs from CSV
  console.log(`\n➕ Adding/updating products from CSV...`);

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of validRecords) {
    try {
      const skuCode = row.SKU.trim();
      const productName = row.Item.trim();
      const supplier = row.Supplier?.trim() || null;
      const category = categorizeWine(row.Origin);

      // Upsert Product
      const product = await prisma.product.upsert({
        where: {
          tenantId_name: {
            tenantId: TENANT_ID,
            name: productName,
          },
        },
        create: {
          tenantId: TENANT_ID,
          name: productName,
          brand: supplier,
          category,
        },
        update: {
          brand: supplier,
          category,
        },
      });

      // Upsert SKU
      const existingSku = await prisma.sku.findFirst({
        where: {
          tenantId: TENANT_ID,
          code: skuCode,
        },
      });

      if (existingSku) {
        await prisma.sku.update({
          where: { id: existingSku.id },
          data: {
            productId: product.id,
            size: row.Unit,
            isActive: true,
          },
        });
        updatedCount++;
      } else {
        await prisma.sku.create({
          data: {
            tenantId: TENANT_ID,
            productId: product.id,
            code: skuCode,
            size: row.Unit,
            unitOfMeasure: "bottle",
            isActive: true,
          },
        });
        addedCount++;
      }

      if ((addedCount + updatedCount) % 100 === 0) {
        console.log(`   Progress: ${addedCount + updatedCount}/${validRecords.length}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing SKU ${row.SKU}: ${error.message}`);
      skippedCount++;
    }
  }

  console.log(`\n✅ Product sync complete:`);
  console.log(`   - Added: ${addedCount} new SKUs`);
  console.log(`   - Updated: ${updatedCount} existing SKUs`);
  console.log(`   - Skipped: ${skippedCount} errors`);

  // Step 5: Update Prices
  console.log(`\n💰 Step 5: Updating prices...`);

  // Get or create price list
  let priceList = await prisma.priceList.findFirst({
    where: {
      tenantId: TENANT_ID,
      name: "Well Crafted Wholesale 2025",
    },
  });

  if (!priceList) {
    priceList = await prisma.priceList.create({
      data: {
        tenantId: TENANT_ID,
        name: "Well Crafted Wholesale 2025",
        currency: "USD",
        isDefault: true,
        effectiveAt: new Date(),
      },
    });
    console.log(`✅ Created new price list: ${priceList.name}`);
  }

  let pricesUpdated = 0;
  let pricesSkipped = 0;

  for (const row of validRecords) {
    try {
      const sku = await prisma.sku.findFirst({
        where: {
          tenantId: TENANT_ID,
          code: row.SKU.trim(),
        },
      });

      if (!sku) {
        pricesSkipped++;
        continue;
      }

      const frontlinePrice = parsePrice(row["Frontline WCB Price"]);
      if (!frontlinePrice || frontlinePrice === 0) {
        pricesSkipped++;
        continue;
      }

      // Delete old prices for this SKU in this price list
      await prisma.priceListItem.deleteMany({
        where: {
          tenantId: TENANT_ID,
          skuId: sku.id,
          priceListId: priceList.id,
        },
      });

      // Create new price
      await prisma.priceListItem.create({
        data: {
          tenantId: TENANT_ID,
          skuId: sku.id,
          priceListId: priceList.id,
          price: frontlinePrice,
          minQuantity: 1,
        },
      });

      pricesUpdated++;

      if (pricesUpdated % 100 === 0) {
        console.log(`   Progress: ${pricesUpdated}/${validRecords.length}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error updating price for SKU ${row.SKU}: ${error.message}`);
      pricesSkipped++;
    }
  }

  console.log(`\n✅ Price update complete:`);
  console.log(`   - Updated: ${pricesUpdated} prices`);
  console.log(`   - Skipped: ${pricesSkipped} (missing price or SKU)`);

  // Step 6: Final validation
  console.log(`\n✅ Step 6: Final validation...`);

  const [finalSkuCount, activeSkuCount, productsWithPrices] = await Promise.all([
    prisma.sku.count({ where: { tenantId: TENANT_ID } }),
    prisma.sku.count({ where: { tenantId: TENANT_ID, isActive: true } }),
    prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        priceListItems: {
          some: {
            priceListId: priceList.id,
          },
        },
      },
    }),
  ]);

  console.log(`\n📊 Final Database State:`);
  console.log(`   - Total SKUs: ${finalSkuCount}`);
  console.log(`   - Active SKUs: ${activeSkuCount}`);
  console.log(`   - SKUs with prices: ${productsWithPrices}`);
  console.log(`   - Expected active (CSV): ${csvSkuCodes.size}`);

  const difference = activeSkuCount - csvSkuCodes.size;
  if (difference > 0) {
    console.log(`\n⚠️  Warning: ${difference} more active SKUs than CSV (likely SKUs with order history)`);
  } else if (difference < 0) {
    console.log(`\n⚠️  Warning: ${Math.abs(difference)} fewer active SKUs than CSV (some imports may have failed)`);
  } else {
    console.log(`\n✅ Perfect match! Active SKUs = CSV SKUs`);
  }

  console.log("\n🎉 Sync completed successfully!");
  console.log("=" .repeat(80));
}

// Helper functions
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // Remove currency symbols, spaces, and extract first number
  const cleaned = priceStr.replace(/[$,\s]/g, "");
  const match = cleaned.match(/[\d.]+/);

  if (!match) return null;

  const price = parseFloat(match[0]);
  return isNaN(price) ? null : price;
}

function categorizeWine(origin: string): string {
  const o = origin?.toLowerCase() || "";

  if (o.includes("spain") || o.includes("spanish")) return "Wine";
  if (o.includes("france") || o.includes("french")) return "Wine";
  if (o.includes("italy") || o.includes("italian")) return "Wine";
  if (o.includes("california") || o.includes("cal")) return "Wine";
  if (o.includes("washington") || o.includes("oregon") || o.includes("new york")) return "Wine";
  if (o.includes("argentina") || o.includes("chile")) return "Wine";
  if (o.includes("australia") || o.includes("new zealand")) return "Wine";
  if (o.includes("south africa")) return "Wine";
  if (o.includes("portugal") || o.includes("german")) return "Wine";

  // Non-alcoholic products
  if (o.includes("non") && o.includes("alcohol")) return "Non-Alcoholic";

  // KEGs and equipment
  if (o.includes("keg")) return "Equipment";
  if (o.includes("gift") || o.includes("box")) return "Gift";

  return "Uncategorized";
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
