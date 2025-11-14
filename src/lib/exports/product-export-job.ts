import { PrismaClient, ProductExportStatus } from "@prisma/client";

import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { queryCatalog } from "@/lib/catalog/query";
import { buildCatalogCsv } from "@/lib/catalog/csv";
import { uploadExportBuffer } from "@/lib/storage/product-exports";

const prisma = new PrismaClient();
const PAGE_SIZE = 500;

export type ProductExportJobPayload = {
  exportJobId: string;
};

export async function processProductExportJob(payload: ProductExportJobPayload) {
  const { exportJobId } = payload;
  const job = await prisma.productExportJob.findUnique({
    where: { id: exportJobId },
  });
  if (!job) {
    throw new Error(`Product export job ${exportJobId} not found`);
  }

  if (job.status === ProductExportStatus.COMPLETED) {
    return;
  }

  await prisma.productExportJob.update({
    where: { id: exportJobId },
    data: {
      status: ProductExportStatus.PROCESSING,
      startedAt: new Date(),
    },
  });

  try {
    const items = await fetchAllCatalogItems(job.tenantId, job.filters ?? {});
    const { buffer, filename, contentType } = await buildFormattedExport(job.format, items);
    const destination = `${job.tenantId}/${filename}`;
    const publicUrl = await uploadExportBuffer(destination, buffer, contentType);

    await prisma.productExportJob.update({
      where: { id: exportJobId },
      data: {
        status: ProductExportStatus.COMPLETED,
        completedAt: new Date(),
        filePath: destination,
        fileUrl: publicUrl,
        rowCount: items.length,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export error";
    await prisma.productExportJob.update({
      where: { id: exportJobId },
      data: {
        status: ProductExportStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function fetchAllCatalogItems(tenantId: string, filters: Record<string, unknown>) {
  const items: Awaited<ReturnType<typeof queryCatalog>>["items"] = [];
  let page = 1;
  while (true) {
    const result = await queryCatalog({
      tenantId,
      search: typeof filters.search === "string" ? filters.search : undefined,
      brands: Array.isArray(filters.brands) ? (filters.brands as string[]) : undefined,
      categories: Array.isArray(filters.categories) ? (filters.categories as string[]) : undefined,
      lifecycle: Array.isArray(filters.lifecycle) ? (filters.lifecycle as string[]) : undefined,
      onlyInStock: typeof filters.onlyInStock === "boolean" ? filters.onlyInStock : undefined,
      sort: (filters.sort as "priority" | "availability" | "az") ?? "priority",
      minAvailable:
        typeof filters.minAvailable === "number" ? (filters.minAvailable as number) : undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    items.push(...result.items);
    if (result.items.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return items;
}

async function buildFormattedExport(
  format: ProductExportJob["format"],
  items: Awaited<ReturnType<typeof fetchAllCatalogItems>>,
) {
  const dateStamp = new Date().toISOString().split("T")[0];
  if (format === "CSV") {
    const csv = buildCatalogCsv(items);
    return {
      buffer: Buffer.from(csv, "utf-8"),
      filename: `catalog-export-${dateStamp}.csv`,
      contentType: "text/csv",
    };
  }
  if (format === "PDF") {
    const pdfBytes = await buildPdfExport(items);
    return {
      buffer: Buffer.from(pdfBytes),
      filename: `catalog-export-${dateStamp}.pdf`,
      contentType: "application/pdf",
    };
  }
  const excelBuffer = await buildExcelExport(items);
  return {
    buffer: Buffer.from(excelBuffer),
    filename: `catalog-export-${dateStamp}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

async function buildPdfExport(items: Awaited<ReturnType<typeof fetchAllCatalogItems>>) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([612, 792]);
  const margin = 40;
  let y = page.getHeight() - margin;
  const drawLine = (text: string) => {
    page.drawText(text, {
      x: margin,
      y,
      size: 10,
      font,
      color: undefined,
    });
    y -= 14;
    if (y <= margin) {
      page = doc.addPage([612, 792]);
      y = page.getHeight() - margin;
    }
  };

  drawLine("Catalog Export");
  drawLine(`Generated: ${new Date().toLocaleString()}`);
  drawLine(`Records: ${items.length}`);
  drawLine("");

  items.slice(0, 200).forEach((item) => {
    drawLine(`${item.productName} (${item.skuCode})`);
    const details = [
      item.brand ?? "Brand TBD",
      item.category ?? "Category TBD",
      `${item.inventory.totals.available} available`,
    ].join(" · ");
    drawLine(details);
    drawLine("");
  });

  return doc.save();
}

async function buildExcelExport(items: Awaited<ReturnType<typeof fetchAllCatalogItems>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Catalog");
  sheet.columns = [
    { header: "SKU Code", key: "skuCode", width: 15 },
    { header: "Product Name", key: "productName", width: 32 },
    { header: "Brand", key: "brand", width: 20 },
    { header: "Category", key: "category", width: 20 },
    { header: "Available", key: "available", width: 12 },
    { header: "On Hand", key: "onHand", width: 12 },
    { header: "Best Price", key: "bestPrice", width: 15 },
  ];

  items.forEach((item) => {
    const bestPrice = item.priceLists[0];
    sheet.addRow({
      skuCode: item.skuCode,
      productName: item.productName,
      brand: item.brand ?? "",
      category: item.category ?? "",
      available: item.inventory.totals.available,
      onHand: item.inventory.totals.onHand,
      bestPrice: bestPrice
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: bestPrice.currency,
          }).format(bestPrice.price)
        : "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
