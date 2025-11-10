'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryCards } from '../components/SummaryCards';
import { ResultsTable } from '../components/ResultsTable';
import { useReportFilters } from '../_context/ReportFiltersContext';
import type { DeliverySummary } from '@/app/api/sales/reports/delivery/summary';

type Invoice = {
  id: string;
  referenceNumber: string;
  date: string;
  customerName: string;
  deliveryMethod: string;
  status: string;
  invoiceType: string;
  total?: string;
};

type DeliveryResponse = {
  invoices: Invoice[];
  summary?: DeliverySummary;
};

export function DeliveryInsightsPanel() {
  const { queryParams } = useReportFilters();
  const [data, setData] = useState<DeliveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(queryParams);
        const queryString = params.toString();
        const url = queryString ? `/api/sales/reports/delivery?${queryString}` : '/api/sales/reports/delivery';
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Unable to load delivery insights');
        }
        const payload = (await response.json()) as DeliveryResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load delivery insights');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paramKey]);

  const summaryMetrics = data?.summary
    ? {
        totalInvoices: data.summary.totalInvoices,
        totalRevenue: data.summary.totalRevenue,
        averageOrderValue: data.summary.averageOrderValue,
        scheduledRate: data.summary.fulfillment.scheduledRate,
      }
    : undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards invoices={data?.invoices ?? []} metrics={summaryMetrics} />

      {data?.summary && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MethodBreakdown summary={data.summary} />
          <FulfillmentInsights summary={data.summary} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoice drill-down</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultsTable invoices={data?.invoices ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function MethodBreakdown({ summary }: { summary: DeliverySummary }) {
  const maxCount = Math.max(...summary.methodBreakdown.map((entry) => entry.invoiceCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery mix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.methodBreakdown.map((method) => (
          <div key={method.method}>
            <div className="flex items-center justify-between text-sm font-medium text-slate-600">
              <span>{method.method}</span>
              <span>
                {method.invoiceCount.toLocaleString()} • {method.share.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${(method.invoiceCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FulfillmentInsights({ summary }: { summary: DeliverySummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment & status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Scheduled rate</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">
              {summary.fulfillment.scheduledRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">Invoices with a delivery date</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Avg. delivery lag</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">
              {summary.fulfillment.avgLagDays.toFixed(1)} days
            </p>
            <p className="text-xs text-slate-500">Issued to delivered</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">Status mix</p>
          <div className="space-y-2">
            {summary.statusBreakdown.map((status) => (
              <div key={status.status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{status.status}</span>
                <span className="text-slate-500">
                  {status.count.toLocaleString()} • {status.share.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
