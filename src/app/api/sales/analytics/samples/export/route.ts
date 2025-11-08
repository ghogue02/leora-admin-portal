import { NextRequest, NextResponse } from 'next/server';
import { endOfDay, isValid, parseISO, startOfDay, subDays } from 'date-fns';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { withSalesSession } from '@/lib/auth/sales';
import {
  fetchSampleAnalytics,
  type SampleAnalyticsFilters,
} from '../_service';

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

function parseFilters(searchParams: URLSearchParams): SampleAnalyticsFilters {
  const filter: SampleAnalyticsFilters = {};
  const salesRepId = searchParams.get('salesRepId');
  const supplierId = searchParams.get('supplierId');
  const skuId = searchParams.get('skuId');
  const customerId = searchParams.get('customerId');

  if (salesRepId) filter.salesRepId = salesRepId;
  if (supplierId) filter.supplierId = supplierId;
  if (skuId) filter.skuId = skuId;
  if (customerId) filter.customerId = customerId;

  return filter;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { searchParams } = request.nextUrl;
    const format = (searchParams.get('format') ?? 'csv').toLowerCase();

    const now = new Date();
    const rawEnd = parseDateParam(searchParams.get('endDate'), now);
    const endDate = endOfDay(rawEnd);
    const rawStart = parseDateParam(
      searchParams.get('startDate'),
      startOfDay(subDays(endDate, 90)),
    );
    const startDate = startOfDay(rawStart);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Invalid date range: startDate must be before endDate' },
        { status: 400 },
      );
    }

    const filters = parseFilters(searchParams);

    const analytics = await fetchSampleAnalytics(db, tenantId, {
      startDate,
      endDate,
      filters,
    });

    if (format === 'csv') {
      const csv = buildCsv(analytics);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="sample-analytics.csv"',
        },
      });
    }

    if (format === 'pdf') {
      const pdfBytes = await buildPdf(analytics, startDate, endDate);
      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="sample-analytics.pdf"',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  });
}

function buildCsv(analytics: Awaited<ReturnType<typeof fetchSampleAnalytics>>): string {
  const lines: string[] = [];
  lines.push('Metric,Value');
  lines.push(`Total Samples,${analytics.overview.totalSamples}`);
  lines.push(`Conversion Rate,${(analytics.overview.conversionRate * 100).toFixed(1)}%`);
  lines.push(`Revenue,${analytics.overview.totalRevenue}`);
  lines.push(`Active Products,${analytics.overview.activeProducts}`);
  lines.push('');

  lines.push('Date,Samples,Conversions,Revenue');
  analytics.trends.forEach((trend) => {
    lines.push(`${trend.date},${trend.samples},${trend.conversions},${trend.revenue}`);
  });
  lines.push('');

  lines.push('Product,SKU,Samples,Orders,Conversion Rate,Revenue');
  analytics.topProducts.forEach((product) => {
    lines.push(
      `${product.productName},${product.skuCode},${product.samplesGiven},${product.orders},${(
        product.conversionRate * 100
      ).toFixed(1)}%,${product.revenue}`,
    );
  });
  lines.push('');

  lines.push('Sales Rep,Samples,Conversions,Conversion Rate,Revenue');
  analytics.repPerformance.forEach((rep) => {
    lines.push(
      `${rep.name},${rep.samplesGiven},${rep.conversions},${(rep.conversionRate * 100).toFixed(1)}%,${rep.revenue}`,
    );
  });

  return lines.join('\n');
}

async function buildPdf(
  analytics: Awaited<ReturnType<typeof fetchSampleAnalytics>>,
  startDate: Date,
  endDate: Date,
) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  let y = 740;

  const drawText = (text: string, options: { bold?: boolean; size?: number } = {}) => {
    const size = options.size ?? 12;
    const textWidth = (options.bold ? fontBold : font).widthOfTextAtSize(text, size);
    if (textWidth > width - 80) {
      const words = text.split(' ');
      let line = '';
      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = (options.bold ? fontBold : font).widthOfTextAtSize(testLine, size);
        if (testWidth > width - 80) {
          page.drawText(line, {
            x: 40,
            y,
            size,
            font: options.bold ? fontBold : font,
          });
          y -= size + 4;
          line = word;
        } else {
          line = testLine;
        }
      });
      if (line) {
        page.drawText(line, {
          x: 40,
          y,
          size,
          font: options.bold ? fontBold : font,
        });
        y -= size + 4;
      }
    } else {
      page.drawText(text, {
        x: 40,
        y,
        size,
        font: options.bold ? fontBold : font,
      });
      y -= size + 4;
    }
  };

  drawText('Sample Analytics Report', { bold: true, size: 18 });
  drawText(`${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`, { size: 12 });
  y -= 8;

  drawText('Overview', { bold: true, size: 14 });
  drawText(`Total Samples: ${analytics.overview.totalSamples}`);
  drawText(`Conversion Rate: ${(analytics.overview.conversionRate * 100).toFixed(1)}%`);
  drawText(`Revenue: $${analytics.overview.totalRevenue.toLocaleString()}`);
  drawText(`Active Products: ${analytics.overview.activeProducts}`);
  y -= 12;

  drawText('Top Products', { bold: true, size: 14 });
  analytics.topProducts.slice(0, 5).forEach((product) => {
    drawText(
      `${product.productName} (${product.skuCode}) — Samples: ${product.samplesGiven}, Orders: ${product.orders}, Conv: ${(product.conversionRate * 100).toFixed(1)}%`,
    );
  });
  y -= 12;

  drawText('Rep Performance', { bold: true, size: 14 });
  analytics.repPerformance.slice(0, 5).forEach((rep) => {
    drawText(
      `${rep.name} — Samples: ${rep.samplesGiven}, Conv: ${(rep.conversionRate * 100).toFixed(1)}%, Revenue: $${rep.revenue.toLocaleString()}`,
    );
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
