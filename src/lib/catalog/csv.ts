import type { CatalogItem } from "@/types/catalog";

const CATALOG_CSV_HEADERS = [
  "SKU Code",
  "Product Name",
  "Brand",
  "Category",
  "Unit",
  "Size",
  "Available",
  "On Hand",
  "Price List",
  "Price",
  "Currency",
  "Min Qty",
  "Max Qty",
];

export function buildCatalogCsv(items: CatalogItem[]): string {
  const rows = items.flatMap((item) => {
    const shared = [
      item.skuCode,
      item.productName,
      item.brand ?? "",
      item.category ?? "",
      item.unitOfMeasure ?? "",
      item.size ?? "",
      item.inventory.totals.available.toString(),
      item.inventory.totals.onHand.toString(),
    ];

    if (item.priceLists.length === 0) {
      return [[...shared, "", "", "", "", ""]];
    }

    return item.priceLists.map((price) => [
      ...shared,
      price.priceListName,
      price.price.toFixed(2),
      price.currency,
      price.minQuantity.toString(),
      price.maxQuantity?.toString() ?? "",
    ]);
  });

  const csvRows = [CATALOG_CSV_HEADERS, ...rows];
  return csvRows.map((row) => row.map(formatCsvValue).join(",")).join("\n");
}

function formatCsvValue(value: string) {
  const normalized = value ?? "";
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
