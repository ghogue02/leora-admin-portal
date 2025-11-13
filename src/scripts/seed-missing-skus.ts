import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const TENANT_ID = "58b8126a-2d2f-4f55-bc98-5b6784800bed";
const DEFAULT_SEED_CSV = path.resolve(process.cwd(), "audit/missing/missing-skus-SEED-DATA.csv");
const ALT_SEED_CSV = path.resolve(process.cwd(), "../audit/missing/missing-skus-SEED-DATA.csv");
const SEED_CSV =
  process.env.SEED_CSV ??
  (fs.existsSync(DEFAULT_SEED_CSV) ? DEFAULT_SEED_CSV : ALT_SEED_CSV);
const DEFAULT_LOCATION = process.env.SEED_LOCATION ?? "Warrenton";

type SeedRow = {
  SKU: string;
  Product_Name: string;
  Brand: string;
  Category: string;
  Unit_Size: string;
  Items_Per_Case: string;
  Total_Bottles_In_WC: string;
  Supplier: string;
  Style: string;
  Colour: string;
  Varieties: string;
  Vintage: string;
};

function parseIntOrNull(value?: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatOrZero(value?: string | null) {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

async function main() {
  if (!fs.existsSync(SEED_CSV)) {
    throw new Error(`Seed CSV not found at ${SEED_CSV}`);
  }

  console.log(`📄 Loading seed data from ${SEED_CSV}`);
  const csvContent = fs.readFileSync(SEED_CSV, "utf-8");
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SeedRow[];

  const summary = {
    createdProducts: 0,
    createdSkus: 0,
    createdInventories: 0,
    skippedExistingSkus: 0,
  };

  for (const row of rows) {
    const code = row.SKU.trim();
    if (!code) continue;

    const existingSku = await prisma.sku.findFirst({
      where: { tenantId: TENANT_ID, code },
      select: { id: true },
    });

    if (existingSku) {
      console.log(`ℹ️  SKU ${code} already exists – skipping`);
      summary.skippedExistingSkus += 1;
      continue;
    }

    const productName = row.Product_Name?.trim() || `Imported ${code}`;
    let product = await prisma.product.findFirst({
      where: { tenantId: TENANT_ID, name: productName },
      select: { id: true },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId: TENANT_ID,
          name: productName,
          brand: row.Brand?.trim() || null,
          category: row.Category?.trim() || null,
          description: row.Supplier ? `Supplier: ${row.Supplier}` : null,
          wineDetails: {
            style: row.Style?.trim() || undefined,
            colour: row.Colour?.trim() || undefined,
            varieties: row.Varieties?.trim() || undefined,
            vintage: row.Vintage?.trim() || undefined,
          },
        },
        select: { id: true },
      });
      summary.createdProducts += 1;
    }

    const itemsPerCase = parseIntOrNull(row.Items_Per_Case) ?? undefined;

    const sku = await prisma.sku.create({
      data: {
        tenantId: TENANT_ID,
        productId: product.id,
        code,
        size: row.Unit_Size?.trim() || null,
        unitOfMeasure: "bottle",
        itemsPerCase,
        isActive: true,
      },
      select: { id: true },
    });
    summary.createdSkus += 1;

    const totalBottles = Math.max(0, Math.round(parseFloatOrZero(row.Total_Bottles_In_WC)));

    await prisma.inventory.create({
      data: {
        tenantId: TENANT_ID,
        skuId: sku.id,
        location: DEFAULT_LOCATION,
        onHand: totalBottles,
        allocated: 0,
        binLocation: null,
      },
    });
    summary.createdInventories += 1;

    console.log(`✅ Seeded ${code} (${productName}) with ${totalBottles} bottles in ${DEFAULT_LOCATION}`);
  }

  console.log("\n📊 Seed summary", summary);
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed SKUs:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
