import { PrismaClient, Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const TENANT_ID = "58b8126a-2d2f-4f55-bc98-5b6784800bed";
const DEFAULT_PRICING_CSV = path.resolve(
  process.cwd(),
  "../Pricing Single Source - Pricing Single Source (1).csv",
);
const PRICING_CSV = process.env.PRICING_CSV ?? DEFAULT_PRICING_CSV;

const PRICE_LISTS = {
  frontline: { id: "d8ad22e0-c069-493b-a23a-a0ad84af7079", name: "Well Crafted Wholesale 2025", column: "Frontline WCB Price" },
  discount: { id: "df99bbaf-2253-4421-affb-93da669a6763", name: "VA, MD, DC wholesale", column: "Discount WCB Price" },
  btg: { id: "3e6c13eb-5328-4015-8613-c99bcd1433ec", name: "Custom S&V Group", column: "BTG- On Premise Only" },
  special: { id: "cd64f651-c699-4013-8d47-0f2cc75dc215", name: "DLC", column: "Special Pricing 1" },
} as const;

type PricingRow = {
  SKU: string;
  [key: string]: string;
};

type UpsertResult = {
  sku: string;
  priceList: string;
  previousPrice: string | null;
  newPrice: string;
  action: "created" | "updated";
};

type MissingEntry = {
  sku: string;
  priceList: string;
  reason: string;
};

function parsePrice(input?: string | null): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[,$]/g, "").trim();
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

function formatPrice(value: Prisma.Decimal | null) {
  if (value === null) return "—";
  return value.toString();
}

async function main() {
  if (!fs.existsSync(PRICING_CSV)) {
    throw new Error(`Pricing CSV not found at ${PRICING_CSV}`);
  }

  console.log(`📄 Loading pricing data from ${PRICING_CSV}`);
  const csvContent = fs.readFileSync(PRICING_CSV, "utf-8");
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as PricingRow[];

  const skuRecords = await prisma.sku.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, code: true },
  });
  const skuMap = new Map(skuRecords.map((sku) => [sku.code, sku.id]));

  const priceItems = await prisma.priceListItem.findMany({
    where: { tenantId: TENANT_ID },
    select: {
      id: true,
      skuId: true,
      priceListId: true,
      price: true,
    },
  });
  const priceItemMap = new Map<string, typeof priceItems[number]>();
  for (const item of priceItems) {
    priceItemMap.set(`${item.priceListId}:${item.skuId}`, item);
  }

  const results: UpsertResult[] = [];
  const missingSkus: string[] = [];
  const missingPrices: MissingEntry[] = [];
  const missingCsvPrices: MissingEntry[] = [];

  for (const row of rows) {
    const skuCode = row.SKU?.trim();
    if (!skuCode) continue;

    const skuId = skuMap.get(skuCode);
    if (!skuId) {
      missingSkus.push(skuCode);
      continue;
    }

    for (const [key, config] of Object.entries(PRICE_LISTS)) {
      const priceValue = parsePrice(row[config.column]);
      const mapKey = `${config.id}:${skuId}`;
      const existing = priceItemMap.get(mapKey);

      if (priceValue === null) {
        if (existing) {
          missingPrices.push({
            sku: skuCode,
            priceList: config.name,
            reason: `CSV missing ${config.column} but DB has ${existing.price}`,
          });
        } else {
          missingCsvPrices.push({
            sku: skuCode,
            priceList: config.name,
            reason: `CSV missing ${config.column}`,
          });
        }
        continue;
      }

      const decimalPrice = new Prisma.Decimal(priceValue.toFixed(2));

      if (existing) {
        if (!existing.price.equals(decimalPrice)) {
          await prisma.priceListItem.update({
            where: { id: existing.id },
            data: { price: decimalPrice },
          });
          results.push({
            sku: skuCode,
            priceList: config.name,
            previousPrice: formatPrice(existing.price),
            newPrice: decimalPrice.toString(),
            action: "updated",
          });
        }
      } else {
        const created = await prisma.priceListItem.create({
          data: {
            tenantId: TENANT_ID,
            priceListId: config.id,
            skuId,
            price: decimalPrice,
            minQuantity: 1,
          },
        });
        priceItemMap.set(mapKey, created);
        results.push({
          sku: skuCode,
          priceList: config.name,
          previousPrice: null,
          newPrice: decimalPrice.toString(),
          action: "created",
        });
      }
    }
  }

  const summaryLines = [
    `# Pricing Audit – ${new Date().toISOString().split("T")[0]}`,
    `Source CSV: ${PRICING_CSV}`,
    "",
    "## Updates",
    `Total rows processed: ${rows.length}`,
    `New or updated price list items: ${results.length}`,
    "",
  ];

  if (results.length > 0) {
    summaryLines.push("### Changes Applied");
    results.slice(0, 50).forEach((result) => {
      summaryLines.push(
        `- ${result.sku}: ${result.priceList} ${result.action} (${result.previousPrice ?? "n/a"} → ${result.newPrice})`,
      );
    });
    if (results.length > 50) {
      summaryLines.push(`…and ${results.length - 50} more changes`);
    }
    summaryLines.push("");
  }

  if (missingSkus.length > 0) {
    summaryLines.push("## SKUs missing in CRM", missingSkus.map((sku) => `- ${sku}`).join("\n"), "");
  }

  if (missingPrices.length > 0) {
    summaryLines.push(
      "## Existing DB prices without CSV values",
      missingPrices.map((entry) => `- ${entry.sku}: ${entry.priceList} (${entry.reason})`).join("\n"),
      "",
    );
  }

  if (missingCsvPrices.length > 0) {
    summaryLines.push(
      "## CSV tiers without matching price (for follow-up)",
      missingCsvPrices.map((entry) => `- ${entry.sku}: ${entry.priceList} (${entry.reason})`).join("\n"),
      "",
    );
  }

  const auditDir = path.resolve(process.cwd(), "audit");
  fs.mkdirSync(auditDir, { recursive: true });
  const reportPath = path.join(auditDir, `pricing-audit-${new Date().toISOString().split("T")[0]}.md`);
  fs.writeFileSync(reportPath, summaryLines.join("\n"), "utf-8");
  console.log(`📝 Pricing audit written to ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("❌ Pricing sync failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
