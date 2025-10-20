import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

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

class WellCraftedParser extends InvoiceParser {
  canParse(text: string): boolean {
    return text.includes("Well Crafted Wine & Beverage Co.") && text.includes("Customer ID:");
  }

  parse(text: string, filePath: string): ParsedInvoice {
    const invoiceNumber =
      this.matchSingle(text, /Invoice Number:\s*([0-9A-Za-z-]+)/) ??
      (() => {
        throw new Error(`Unable to find invoice number for ${filePath}`);
      })();

    const invoiceDate = this.parseDate(
      this.matchSingle(text, /Invoice Date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/),
    );

    const customerId = this.matchSingle(text, /Customer ID:\s*([0-9A-Za-z-]+)/);
    const retailLicense = this.matchSingle(text, /Retail License Number:\s*([0-9A-Za-z-]+)/);

    const paymentTerms = this.matchSingle(text, /Payment terms\s*\n([^\n]+)/)?.split(/\s{2,}/).pop()?.trim() ?? null;
    const shipDate = this.parseDate(this.matchSingle(text, /Ship date\s*\n([A-Za-z]+\s+\d{1,2},\s+\d{4})/));
    const dueDate = this.parseDate(this.matchSingle(text, /Due date\s*\n([A-Za-z]+\s+\d{1,2},\s+\d{4})/));
    const salesperson = this.matchSingle(text, /Salesperson\s*\n([^\n]+)/);
    const shippingMethod = this.matchSingle(text, /Shipping method\s*\n([^\n]+)/);

    const lines = text.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) =>
      line.includes("No. bottles") && line.includes("Brand & type") && line.includes("Amount"),
    );

    if (headerIndex === -1) {
      throw new Error(`Unable to locate line item header for ${filePath}`);
    }

    const layoutHeader = lines.find((line) =>
      line.includes("Bill to:") && line.includes("Customer ID:") && line.includes("Ship to:"),
    );

    if (!layoutHeader) {
      throw new Error(`Unable to locate Bill to/Ship to header for ${filePath}`);
    }

    const billToStart = layoutHeader.indexOf("Bill to:");
    const customerIdStart = layoutHeader.indexOf("Customer ID:");
    const shipToStart = layoutHeader.indexOf("Ship to:");

    const addressLines: string[] = [];
    const customerIdSegments: string[] = [];
    let cursor = lines.indexOf(layoutHeader) + 1;
    let started = false;
    while (cursor < lines.length) {
      const row = lines[cursor];
      const isBlank = row.trim().length === 0;
      if (!started && isBlank) {
        cursor += 1;
        continue;
      }
      if (started && isBlank) {
        break;
      }
      started = true;
      addressLines.push(row);
      const customerIdSegment = row.slice(customerIdStart, shipToStart).trim();
      if (customerIdSegment.length > 0) {
        customerIdSegments.push(customerIdSegment);
      }
      cursor += 1;
    }

    const billToLines: string[] = [];
    const shipToLines: string[] = [];
    for (const line of addressLines) {
      const billSegment = line.slice(billToStart, customerIdStart).trimEnd();
      const shipSegment = line.slice(shipToStart).trimEnd();
      if (billSegment.trim().length > 0) {
        billToLines.push(billSegment.trim());
      }
      if (shipSegment.trim().length > 0) {
        shipToLines.push(shipSegment.trim());
      }
    }

    const resolvedCustomerId =
      customerIdSegments
        .map((segment) => segment.split(/\s+/)[0])
        .find((entry) => /\d/.test(entry)) ?? null;

    const customer: ParsedAddress = {
      name: billToLines[0] ?? null,
      lines: billToLines.slice(1),
      licenseNumber: retailLicense,
      customerId: resolvedCustomerId ?? customerId ?? null,
    };

    const shipTo: ParsedAddress | null = shipToLines.length
      ? {
          name: shipToLines[0] ?? null,
          lines: shipToLines.slice(1),
        }
      : null;

    const lineItems = this.parseLineItems(lines.slice(headerIndex));
    const total = this.parseNumber(this.matchSingle(text, /Total\s+([\d,]+\.\d{2})/));

    return {
      vendor: "Well Crafted Wine & Beverage Co.",
      sourceFile: filePath,
      invoiceNumber,
      invoiceDate,
      paymentTerms,
      shipDate,
      dueDate,
      salesperson,
      shippingMethod,
      customer,
      shipTo,
      total,
      items: lineItems,
    };
  }

  private parseLineItems(lines: string[]): InvoiceLine[] {
    const header = lines.find((line) => line.includes("No. bottles"));
    if (!header) {
      throw new Error("Unable to detect line item column layout");
    }

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
      const line = rawLine.replace(/\u00a0/g, " "); // replace non-breaking spaces
      if (line.trim().length === 0) {
        continue;
      }

      // Skip the header row itself
      if (line.includes("No. bottles") && line.includes("Brand & type")) {
        continue;
      }

      if (/^Total\s/.test(line.trim())) {
        break;
      }

      const quantitySegment = line.slice(boundaries.quantity, boundaries.size).trim();
      const sizeSegment = line.slice(boundaries.size, boundaries.code).trim();
      const codeSegment = line.slice(boundaries.code, boundaries.sku).trim();
      const skuSegment = line.slice(boundaries.sku, boundaries.brand).trim();
      const brandSegment = line.slice(boundaries.brand, boundaries.liters).trim();
      const litersSegment = line.slice(boundaries.liters, boundaries.unitPrice).trim();
      const unitPriceSegment = line.slice(boundaries.unitPrice, boundaries.amount).trim();
      const amountSegment = line.slice(boundaries.amount).trim();

      const isNewRow = quantitySegment.length > 0 || skuSegment.length > 0 || amountSegment.length > 0;

      if (isNewRow) {
        if (current) {
          items.push(current);
        }
        current = {
          description: brandSegment,
          sku: skuSegment || null,
          code: codeSegment || null,
          size: sizeSegment || null,
          quantityBottles: this.parseInteger(quantitySegment),
          liters: this.parseNumber(litersSegment),
          unitPrice: this.parseNumber(unitPriceSegment),
          amount: this.parseNumber(amountSegment),
        };
        continue;
      }

      if (!current) {
        continue;
      }

      if (codeSegment) {
        current.code = current.code ? `${current.code} ${codeSegment}` : codeSegment;
      }
      if (brandSegment) {
        current.description = `${current.description} ${brandSegment}`.trim();
      }
    }

    if (current) {
      items.push(current);
    }

    return items;
  }

  private parseInteger(value: string | null): number | null {
    if (!value) return null;
    const number = Number.parseInt(value.replace(/\D+/g, ""), 10);
    return Number.isFinite(number) ? number : null;
  }
}

class CanopyParser extends InvoiceParser {
  canParse(text: string): boolean {
    return text.includes("Canopy Wine Selections");
  }

  parse(text: string, filePath: string): ParsedInvoice {
    const invoiceNumber =
      this.matchSingle(text, /Invoice #:\s*([0-9A-Za-z-]+)/) ??
      (() => {
        throw new Error(`Unable to find invoice number for ${filePath}`);
      })();

    const invoiceDate = this.parseDate(
      this.matchSingle(text, /Invoice date:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/),
    );

    const lines = text.split(/\r?\n/);
    const layoutHeader = lines.find(
      (line) => line.includes("Seller:") && line.includes("Bill to:") && line.includes("Ship to:"),
    );

    if (!layoutHeader) {
      throw new Error(`Unable to locate Seller/Bill to/Ship to header for ${filePath}`);
    }

    const sellerStart = layoutHeader.indexOf("Seller:");
    const billToStart = layoutHeader.indexOf("Bill to:");
    const shipToStart = layoutHeader.indexOf("Ship to:");

    const sellerSegments: string[] = [];
    const billSegments: string[] = [];
    const shipSegments: string[] = [];

    let cursor = lines.indexOf(layoutHeader) + 1;
    let started = false;
    while (cursor < lines.length) {
      const row = lines[cursor];
      const isBlank = row.trim().length === 0;
      if (!started && isBlank) {
        cursor += 1;
        continue;
      }
      if (started && isBlank) {
        break;
      }
      started = true;

      sellerSegments.push(row.slice(sellerStart, billToStart).trim());
      billSegments.push(row.slice(billToStart, shipToStart).trim());
      shipSegments.push(row.slice(shipToStart).trim());
      cursor += 1;
    }

    const customerName =
      billSegments.find((segment) => segment.length > 0 && !segment.startsWith("Tax") && !segment.startsWith("License")) ??
      null;
    const customerLines = billSegments
      .filter((segment) => segment.length > 0 && segment !== customerName)
      .filter((segment) => !segment.startsWith("Tax") && !segment.startsWith("License"));

    const shipToName = shipSegments.find((segment) => segment.length > 0) ?? null;
    const shipToLines = shipSegments.filter((segment) => segment.length > 0 && segment !== shipToName);

    const customer: ParsedAddress = {
      name: customerName,
      lines: customerLines,
      customerId: null,
    };

    const shipTo: ParsedAddress | null = shipToName
      ? {
          name: shipToName,
          lines: shipToLines,
        }
      : null;

    const portfolio =
      sellerSegments
        .find((segment) => segment.startsWith("Portfolio:"))
        ?.replace("Portfolio:", "")
        .trim() ?? null;

    const salesperson =
      sellerSegments
        .find((segment) => segment.startsWith("Salesperson:"))
        ?.replace("Salesperson:", "")
        .trim() ?? this.matchSingle(text, /Salesperson:\s*([^\n]+)/);

    const headerIndex = lines.findIndex(
      (line) =>
        line.includes("Name:") &&
        line.includes("Item #:") &&
        line.includes("Cases:") &&
        line.includes("Net price USD"),
    );

    if (headerIndex === -1) {
      throw new Error(`Unable to locate item header for ${filePath}`);
    }

    const { items, total: computedTotal } = this.parseItems(lines.slice(headerIndex));
    const total = computedTotal;

    return {
      vendor: sellerSegments[0] || "Canopy Wine Selections",
      sourceFile: filePath,
      invoiceNumber,
      invoiceDate,
      salesperson,
      shippingMethod: this.matchSingle(text, /Shipping method:\s*([^\n]+)/),
      paymentTerms: null,
      shipDate: null,
      dueDate: null,
      customer,
      shipTo,
      portfolio,
      total: total ?? computedTotal,
      items,
    };
  }

  private parseItems(lines: string[]): { items: InvoiceLine[]; total: number | null } {
    const header = lines.find((line) => line.includes("Item #:") && line.includes("Net price USD"));
    if (!header) {
      throw new Error("Unable to derive table layout for Canopy invoice");
    }

    const items: InvoiceLine[] = [];
    let total: number | null = null;
    let current: InvoiceLine | null = null;
    const rowPattern =
      /^\s*(.*?)\s{2,}([0-9A-Za-z'-]+)\s+([\d.]+)\s+([0-9A-Za-z x]+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,.]+)$/;

    for (const rawLine of lines.slice(2)) {
      const line = rawLine.replace(/\u00a0/g, " ").trimEnd();
      if (line.length === 0) continue;
      const trimmedStart = line.trimStart();
      if (trimmedStart.startsWith("Total:")) {
        const matches = Array.from(trimmedStart.matchAll(/[\d,]+\.\d{2}/g));
        total = matches.length > 0 ? this.parseNumber(matches[matches.length - 1][0]) : total;
        break;
      }
      if (trimmedStart.startsWith("Certified") || trimmedStart.startsWith("Name:")) continue;

      const match = rowPattern.exec(line);
      if (match) {
        if (current) {
          items.push(current);
        }

        const [, description, sku, cases, size, unitQty, unitPrice, , netPrice] = match;

        current = {
          description: description.trim(),
          sku: sku.trim() || null,
          size: size.trim() || null,
          quantityCases: this.parseNumber(cases.trim()),
          quantityBottles: this.parseNumber(unitQty.trim()),
          unitPrice: this.parseNumber(unitPrice.trim()),
          amount: this.parseNumber(netPrice.trim()),
        };
        continue;
      }

      if (current) {
        current.description = `${current.description} ${trimmedStart}`.trim();
      }
    }

    if (current) {
      items.push(current);
    }

    return { items, total };
  }
}

class WellCraftedClassicParser extends InvoiceParser {
  canParse(text: string): boolean {
    return text.includes("Distributor") && text.includes("Well Crafted Wine & Beverage Co.") && text.includes("Invoice No");
  }

  parse(text: string, filePath: string): ParsedInvoice {
    const invoiceNumber =
      this.matchSingle(text, /Invoice\s*No\.?\s*([0-9A-Za-z-]+)/) ??
      (() => {
        throw new Error(`Unable to find invoice number for ${filePath}`);
      })();

    const invoiceDate = this.parseDate(this.matchSingle(text, /Date of invoice\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/));
    const paymentTerms = this.matchSingle(text, /Terms\s+([^\n]+)/);
    const salesperson = this.matchSingle(text, /Salesperson\s+([^\n]+)/);

    const licenseeName = this.matchSingle(text, /Licensee\s*\/\s*([^\n]+)/);
    const licenseNumber = this.matchSingle(text, /License #\s*([^\n]+)/);
    const street = this.matchSingle(text, /Street\s*([^\n]+)/);
    const streetContinuation = this.matchSingle(text, /Street[^\n]*\n\s+([^\n]+)/);
    const cityLine = this.matchSingle(text, /City\s*([^\n]+)/);

    const customer: ParsedAddress = {
      name: licenseeName,
      lines: [street, streetContinuation, cityLine].filter((item): item is string => Boolean(item && item.trim().length > 0)),
      licenseNumber,
      customerId: null,
    };

    const shipTo: ParsedAddress = {
      name: licenseeName,
      lines: [street, streetContinuation, cityLine].filter((item): item is string => Boolean(item && item.trim().length > 0)),
    };

    const lines = text.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => line.includes("TOTAL") && line.includes("SIZE IN") && line.includes("BOTTLE"));
    if (headerIndex === -1) {
      throw new Error(`Unable to locate table header for ${filePath}`);
    }

    const headerRow1 = lines[headerIndex];
    const headerRow2 = lines[headerIndex + 1] ?? "";

    const boundaries = {
      cases: headerRow2.indexOf("CASES"),
      bottles: headerRow2.indexOf("BOTTLES"),
      size: headerRow1.indexOf("SIZE IN"),
      code: headerRow1.indexOf("CODE"),
      sku: headerRow1.indexOf("SKU"),
      brand: headerRow1.indexOf("BRAND"),
      liters: headerRow1.lastIndexOf("LITERS"),
      unitPrice: headerRow1.indexOf("BOTTLE"),
      amount: headerRow1.lastIndexOf("TOTAL"),
    };

    if (Object.values(boundaries).some((position) => position < 0)) {
      throw new Error(`Unable to determine column boundaries for ${filePath}`);
    }

    const dataLines = lines.slice(headerIndex + 2);
    const items: InvoiceLine[] = [];
    let current: InvoiceLine | null = null;

    for (const rawLine of dataLines) {
      const line = rawLine.replace(/\u00a0/g, " ");
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }
      if (trimmed.startsWith("DATE") || trimmed.startsWith("Invoices shall")) {
        break;
      }

      const casesSegment = line.slice(boundaries.cases, boundaries.bottles).trim();
      const bottlesSegment = line.slice(boundaries.bottles, boundaries.size).trim();
      const sizeSegment = line.slice(boundaries.size, boundaries.code).trim();
      const codeSegment = line.slice(boundaries.code, boundaries.sku).trim();
      const skuSegment = line.slice(boundaries.sku, boundaries.brand).trim();
      const brandSegment = line.slice(boundaries.brand, boundaries.liters).trim();
      const litersSegment = line.slice(boundaries.liters, boundaries.unitPrice).trim();
      const unitPriceSegment = line.slice(boundaries.unitPrice, boundaries.amount).trim();
      const amountSegment = line.slice(boundaries.amount).trim();

      const isNewRow =
        casesSegment.length > 0 ||
        (skuSegment.length > 0 && /^[A-Za-z0-9]/.test(skuSegment)) ||
        (amountSegment.length > 0 && /^[\d,]+/.test(amountSegment));

      if (isNewRow) {
        if (current) {
          items.push(current);
        }

        current = {
          description: brandSegment || (skuSegment ? skuSegment : "Untitled Item"),
          sku: skuSegment || null,
          code: codeSegment || null,
          size: sizeSegment || null,
          quantityCases: this.parseNumber(casesSegment),
          quantityBottles: this.parseNumber(bottlesSegment),
          liters: this.parseNumber(litersSegment),
          unitPrice: this.parseNumber(unitPriceSegment),
          amount: this.parseNumber(amountSegment),
        };
        continue;
      }

      if (!current) continue;

      if (codeSegment) {
        current.code = current.code ? `${current.code} ${codeSegment}`.trim() : codeSegment;
      }
      if (brandSegment) {
        current.description = `${current.description} ${brandSegment}`.trim();
      }
    }

    if (current) {
      items.push(current);
    }

    const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

    return {
      vendor: "Well Crafted Wine & Beverage Co.",
      sourceFile: filePath,
      invoiceNumber,
      invoiceDate,
      paymentTerms,
      shipDate: null,
      dueDate: null,
      salesperson,
      shippingMethod: null,
      customer,
      shipTo,
      total,
      items,
    };
  }
}

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

function collectPdfFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries
    .filter((entry) => extname(entry).toLowerCase() === ".pdf")
    .map((entry) => resolve(directory, entry))
    .filter((filePath) => statSync(filePath).isFile());
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const directoryArgIndex = args.findIndex((arg) => arg === "--directory" || arg === "-d");
  const directory =
    directoryArgIndex !== -1 && args[directoryArgIndex + 1]
      ? resolve(args[directoryArgIndex + 1])
      : resolve(process.cwd(), "../invoices");

  if (!existsSync(directory)) {
    throw new Error(`Invoice directory not found: ${directory}`);
  }

  const dryRun = !args.includes("--write");
  const limitArgIndex = args.findIndex((arg) => arg === "--limit" || arg === "-l");
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1] ? Number.parseInt(args[limitArgIndex + 1], 10) : null;

  const files = collectPdfFiles(directory).slice(0, limit ?? undefined);
  if (files.length === 0) {
    console.log("No PDF invoices found.");
    return;
  }

  if (!dryRun) {
    hydrateEnvFromLocalFile();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Configure your .env.local or export the variable before using --write.");
    }
  }

  console.log(`Found ${files.length} PDF invoice(s) in ${directory}`);

  const prisma = new PrismaClient();
  let processed = 0;

  const parsers: InvoiceParser[] = [new WellCraftedParser(), new WellCraftedClassicParser(), new CanopyParser()];

  for (const file of files) {
    try {
      const text = extractText(file);
      if (!text || text.trim().length === 0) {
        console.warn(`Skipping ${file}: PDF contained no extractable text (blank or scanned without OCR).`);
        continue;
      }
      const parser = parsers.find((candidate) => candidate.canParse(text));
      if (!parser) {
        console.warn(`Skipping ${file}: unsupported invoice format.`);
        continue;
      }

      const parsed = parser.parse(text, file);

      if (dryRun) {
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        await upsertInvoice(prisma, parsed);
      }

      processed += 1;
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
    }
  }

  await prisma.$disconnect();
  console.log(`Processed ${processed} invoice(s).`);
}

async function upsertInvoice(prisma: PrismaClient, data: ParsedInvoice) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "well-crafted" },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error("Unable to resolve tenant. Set DEFAULT_TENANT_SLUG in environment.");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      tenantId: tenant.id,
      ...(data.customer.customerId
        ? { externalId: data.customer.customerId }
        : data.customer.name
          ? { name: data.customer.name }
          : {}),
    },
    select: { id: true },
  });

  const customerId =
    existingCustomer?.id ??
    (
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: data.customer.name ?? "Unknown Customer",
          externalId: data.customer.customerId,
          street1: data.customer.lines[0] ?? null,
          street2: data.customer.lines[1] ?? null,
          city: data.customer.lines[2] ?? null,
          phone: null,
        },
        select: { id: true },
      })
    ).id;

  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId: tenant.id,
      invoiceNumber: data.invoiceNumber,
    },
    select: {
      id: true,
      orderId: true,
    },
  });

  if (existingInvoice) {
    await prisma.orderLine.deleteMany({
      where: { orderId: existingInvoice.orderId },
    });
    await prisma.invoice.delete({
      where: { id: existingInvoice.id },
    });
    await prisma.order.delete({
      where: { id: existingInvoice.orderId },
    });
  }

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId,
      status: "FULFILLED",
      orderedAt: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      total: data.total ? new Prisma.Decimal(data.total) : null,
      currency: "USD",
    },
    select: { id: true },
  });

  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      customerId,
      invoiceNumber: data.invoiceNumber,
      status: "PAID",
      subtotal: data.total ? new Prisma.Decimal(data.total) : null,
      total: data.total ? new Prisma.Decimal(data.total) : null,
      issuedAt: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  for (const line of data.items) {
    const quantity = resolveQuantity(line);
    if (!quantity || quantity <= 0) {
      continue;
    }

    const skuCode = line.sku?.trim();
    if (!skuCode) {
      console.warn(`Skipping line "${line.description}" (invoice ${data.invoiceNumber}) - missing SKU`);
      continue;
    }

    const skuRecord = await prisma.sku.findFirst({
      where: {
        tenantId: tenant.id,
        code: skuCode,
      },
      select: { id: true },
    });

    if (!skuRecord) {
      console.warn(`Skipping line "${line.description}" (invoice ${data.invoiceNumber}) - SKU ${skuCode} not found`);
      continue;
    }

    const unitPrice = resolveUnitPrice(line, quantity);
    if (unitPrice === null) {
      console.warn(`Skipping line "${line.description}" (invoice ${data.invoiceNumber}) - unable to resolve unit price`);
      continue;
    }

    await prisma.orderLine.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        skuId: skuRecord.id,
        quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        appliedPricingRules: null,
      },
    });
  }

  console.log(`Imported invoice ${data.invoiceNumber}`);
}

function resolveQuantity(item: InvoiceLine): number | null {
  if (item.quantityBottles && item.quantityBottles > 0) {
    return Math.round(item.quantityBottles);
  }

  if (item.quantityCases && item.quantityCases > 0) {
    const multiplier = parseCaseMultiplier(item.size) ?? 12;
    return Math.round(item.quantityCases * multiplier);
  }

  return null;
}

function resolveUnitPrice(item: InvoiceLine, quantity: number): number | null {
  if (item.unitPrice !== null && item.unitPrice !== undefined) {
    return item.unitPrice;
  }
  if (item.amount !== null && item.amount !== undefined && quantity > 0) {
    const derived = item.amount / quantity;
    return Number.isFinite(derived) ? derived : null;
  }
  return null;
}

function parseCaseMultiplier(size?: string | null): number | null {
  if (!size) return null;
  const match = size.match(/(\d+(?:\.\d+)?)\s*x/i);
  if (match) {
    const value = Number.parseFloat(match[1]);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function printHelp() {
  console.log(`Usage: npm run import:invoices -- [options]

Options:
  -d, --directory <path>   Path to directory containing PDF invoices (default: ../invoices)
  -l, --limit <number>     Process only the first <number> invoices
      --write              Persist parsed invoices to the database (default: dry run with JSON output)
  -h, --help               Show this help message`);
}

function hydrateEnvFromLocalFile() {
  if (process.env.DATABASE_URL) {
    return;
  }
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const contents = spawnSync("cat", [envPath], { encoding: "utf8" }).stdout ?? "";
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
