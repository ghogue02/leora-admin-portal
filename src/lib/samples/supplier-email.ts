import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { sendEmail } from '@/lib/marketing/email-service';
import { fetchSampleAnalytics } from '@/app/api/sales/analytics/samples/_service';

export async function sendSupplierSampleReportEmail(
  db: PrismaClient,
  options: {
    tenantId: string;
    supplierId: string;
    recipient: string;
    requestedBy: { fullName: string; email: string };
    startDate?: string;
    endDate?: string;
  },
) {
  const supplier = await db.supplier.findFirst({
    where: { id: options.supplierId, tenantId: options.tenantId },
    select: { id: true, name: true },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const endDate = options.endDate ? new Date(options.endDate) : new Date();
  const startDate = options.startDate ? new Date(options.startDate) : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  const analytics = await fetchSampleAnalytics(db, options.tenantId, {
    startDate,
    endDate,
    filters: { supplierId: supplier.id },
  });

  const subject = `Sampling Performance Update: ${supplier.name}`;
  const body = buildEmailBody({ supplier, analytics, startDate, endDate, requestedBy: options.requestedBy });

  const result = await sendEmail(options.tenantId, {
    to: options.recipient,
    from: process.env.EMAIL_FROM ?? 'samples@wellcraftedwine.com',
    subject,
    html: body,
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Unable to send supplier sample report email');
  }

  return { subject };
}

function buildEmailBody(params: {
  supplier: { id: string; name: string };
  analytics: Awaited<ReturnType<typeof fetchSampleAnalytics>>;
  startDate: Date;
  endDate: Date;
  requestedBy: { fullName: string; email: string };
}) {
  const { supplier, analytics, startDate, endDate, requestedBy } = params;
  const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #1f2937;">${supplier.name} – Sampling Performance</h2>
      <p style="color: #4b5563;">${formatDate(startDate)} – ${formatDate(endDate)}</p>
      <p style="color: #4b5563;">Hi there,</p>
      <p style="color: #4b5563;">Here’s a quick snapshot of how your samples are performing with our customers.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            <strong>Total Samples</strong>
            <div>${analytics.overview.totalSamples.toLocaleString()}</div>
          </td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            <strong>Conversion Rate</strong>
            <div>${(analytics.overview.conversionRate * 100).toFixed(1)}%</div>
          </td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">
            <strong>Revenue</strong>
            <div>$${analytics.overview.totalRevenue.toLocaleString()}</div>
          </td>
        </tr>
      </table>
      <h3 style="color: #1f2937;">Top Performing SKUs</h3>
      <ul>
        ${analytics.topProducts
          .slice(0, 5)
          .map(
            (product) =>
              `<li>${product.productName} (${product.skuCode}) – ${(
                product.conversionRate * 100
              ).toFixed(1)}% conversion, $${product.revenue.toLocaleString()} revenue</li>`,
          )
          .join('')}
      </ul>
      <p style="color: #4b5563; margin-top: 24px;">
        Let me know if you’d like behind-the-label details or a joint tasting visit.
      </p>
      <p style="color: #4b5563;">Thanks,<br>${requestedBy.fullName}<br>${requestedBy.email}</p>
    </div>
  `;
}
