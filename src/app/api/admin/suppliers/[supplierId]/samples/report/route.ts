import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { endOfDay, format, isValid, parseISO, startOfDay, subDays } from "date-fns";
import { withAdminSession } from "@/lib/auth/admin";
import { fetchSampleAnalytics } from "@/app/api/sales/analytics/samples/_service";

type RouteContext = {
  params: Promise<{
    supplierId: string;
  }>;
};

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { supplierId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const formatParam = (searchParams.get("format") ?? "pdf").toLowerCase();

    const now = new Date();
    const endDate = endOfDay(parseDate(searchParams.get("endDate"), now));
    const startDate = startOfDay(
      parseDate(searchParams.get("startDate"), subDays(endDate, 90)),
    );

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Invalid date range: startDate must be before endDate" },
        { status: 400 },
      );
    }

    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const analytics = await fetchSampleAnalytics(db, tenantId, {
      startDate,
      endDate,
      filters: { supplierId },
    });

    if (formatParam === "csv") {
      const csv = buildCsvReport(supplier.name, analytics);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="supplier-${supplierId}-samples.csv"`,
        },
      });
    }

    const pdfBytes = await buildPdfReport(supplier.name, analytics, startDate, endDate);
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="supplier-${supplierId}-samples.pdf"`,
      },
    });
  });
}

function buildCsvReport(name: string, analytics: Awaited<ReturnType<typeof fetchSampleAnalytics>>) {
  const lines: string[] = [];
  lines.push(`Supplier,${name}`);
  lines.push(`Total Samples,${analytics.overview.totalSamples}`);
  lines.push(`Conversion Rate,${(analytics.overview.conversionRate * 100).toFixed(1)}%`);
  lines.push(`Revenue,${analytics.overview.totalRevenue}`);
  lines.push('');
  lines.push('Product,SKU,Samples,Conversions,Conversion Rate,Revenue');
  analytics.topProducts.forEach((product) => {
    lines.push(
      `${product.productName},${product.skuCode},${product.samplesGiven},${product.orders},${(
        product.conversionRate * 100
      ).toFixed(1)}%,${product.revenue}`,
    );
  });
  return lines.join('\n');
}

async function buildPdfReport(
  name: string,
  analytics: Awaited<ReturnType<typeof fetchSampleAnalytics>>,
  startDate: Date,
  endDate: Date,
) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 740;

  const draw = (text: string, options: { bold?: boolean; size?: number } = {}) => {
    const size = options.size ?? 12;
    page.drawText(text, {
      x: 40,
      y,
      size,
      font: options.bold ? fontBold : font,
    });
    y -= size + 6;
  };

  draw(`Supplier Performance Report`, { bold: true, size: 18 });
  draw(name, { size: 14 });
  draw(`${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`);
  y -= 10;

  draw('Overview', { bold: true, size: 14 });
  draw(`Total Samples: ${analytics.overview.totalSamples}`);
  draw(`Conversion Rate: ${(analytics.overview.conversionRate * 100).toFixed(1)}%`);
  draw(`Revenue: $${analytics.overview.totalRevenue.toLocaleString()}`);
  y -= 10;

  draw('Top Products', { bold: true, size: 14 });
  analytics.topProducts.slice(0, 5).forEach((product) => {
    draw(
      `${product.productName} (${product.skuCode}) — Samples: ${product.samplesGiven}, Conversions: ${product.orders}, Conv: ${(product.conversionRate * 100).toFixed(1)}%`,
    );
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
