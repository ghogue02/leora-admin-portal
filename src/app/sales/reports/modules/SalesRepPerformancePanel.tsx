'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useReportFilters } from '../_context/ReportFiltersContext';

interface SalesRepRow {
  id: string;
  name: string;
  email: string | null;
  territory: string | null;
  totalRevenue: number;
  orderCount: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  revenueShare: number;
  topCustomers: Array<{ id: string; name: string; revenue: number; orders: number }>;
}

interface SalesRepPerformanceResponse {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgRevenuePerRep: number;
    activeReps: number;
    topRep: SalesRepRow | null;
    startDate: string;
    endDate: string;
  };
  reps: SalesRepRow[];
}

export function SalesRepPerformancePanel() {
  const { queryParams } = useReportFilters();
  const [data, setData] = useState<SalesRepPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (queryParams.startDate) params.set('startDate', queryParams.startDate);
    if (queryParams.endDate) params.set('endDate', queryParams.endDate);
    if (queryParams.deliveryMethod) params.set('deliveryMethod', queryParams.deliveryMethod);
    if (queryParams.usageFilter) params.set('usageFilter', queryParams.usageFilter);
    return params.toString();
  }, [queryParams.deliveryMethod, queryParams.endDate, queryParams.startDate, queryParams.usageFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          qs ? `/api/sales/reports/rep-performance?${qs}` : '/api/sales/reports/rep-performance',
          { cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Unable to load sales rep performance');
        }
        const payload = (await response.json()) as SalesRepPerformanceResponse;
        setData(payload);
        if (payload.reps.length > 0) {
          setSelectedRepId((prev) => prev ?? payload.reps[0]?.id ?? null);
        } else {
          setSelectedRepId(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Unable to load sales rep performance');
        setData(null);
        setSelectedRepId(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [qs]);

  if (loading) {
    return <Skeleton className="h-[520px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.reps.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No rep activity for this range</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Adjust the filters to a wider date range or remove delivery filters to see how your teams are
          performing.
        </CardContent>
      </Card>
    );
  }

  const selectedRep = data.reps.find((rep) => rep.id === selectedRepId) ?? data.reps[0];

  const timeframeLabel = formatRangeLabel(data.summary.startDate, data.summary.endDate);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total revenue" value={formatCurrency(data.summary.totalRevenue)} hint={timeframeLabel} />
        <MetricCard
          title="Average order value"
          value={formatCurrency(data.summary.avgOrderValue)}
          hint={`${formatNumber(data.summary.totalOrders)} orders`}
        />
        <MetricCard
          title="Average revenue / rep"
          value={formatCurrency(data.summary.avgRevenuePerRep)}
          hint={`${formatNumber(data.summary.activeReps)} active reps`}
        />
        <MetricCard
          title="Top performer"
          value={data.summary.topRep ? data.summary.topRep.name : '—'}
          hint={
            data.summary.topRep
              ? `${formatCurrency(data.summary.topRep.totalRevenue)} (${(data.summary.topRep.revenueShare * 100).toFixed(1)}% share)`
              : 'No data'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales rep leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Rep</th>
                  <th className="px-2 py-2">Territory</th>
                  <th className="px-2 py-2">Revenue</th>
                  <th className="px-2 py-2">Orders</th>
                  <th className="px-2 py-2">Customers</th>
                  <th className="px-2 py-2">Avg order</th>
                  <th className="px-2 py-2">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.reps.map((rep) => {
                  const isSelected = rep.id === selectedRep.id;
                  return (
                    <tr
                      key={rep.id}
                      className={`cursor-pointer transition hover:bg-slate-50 ${isSelected ? 'bg-slate-50/60' : ''}`}
                      onClick={() => setSelectedRepId(rep.id)}
                    >
                      <td className="px-2 py-3">
                        <div className="font-semibold text-slate-900">{rep.name}</div>
                        <div className="text-xs text-slate-500">{rep.email ?? '—'}</div>
                      </td>
                      <td className="px-2 py-3 text-slate-600">{rep.territory ?? '—'}</td>
                      <td className="px-2 py-3 font-semibold text-slate-900">{formatCurrency(rep.totalRevenue)}</td>
                      <td className="px-2 py-3">{formatNumber(rep.orderCount)}</td>
                      <td className="px-2 py-3">{formatNumber(rep.uniqueCustomers)}</td>
                      <td className="px-2 py-3">{formatCurrency(rep.avgOrderValue)}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={rep.revenueShare * 100} className="w-24" />
                          <span className="text-xs font-semibold text-slate-600">
                            {(rep.revenueShare * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rep spotlight</CardTitle>
            <p className="text-xs text-slate-500">{selectedRep.territory ?? 'No territory'} • {selectedRep.email ?? 'no email'}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(selectedRep.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Orders</p>
                <p className="text-lg font-semibold text-slate-900">{formatNumber(selectedRep.orderCount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Customers</p>
                <p className="text-lg font-semibold text-slate-900">{formatNumber(selectedRep.uniqueCustomers)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg order value</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(selectedRep.avgOrderValue)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Top customers</p>
              {selectedRep.topCustomers.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No customer activity recorded in this range.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {selectedRep.topCustomers.map((customer) => (
                    <li key={customer.id} className="flex items-center justify-between text-slate-700">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-slate-500">{formatNumber(customer.orders)} orders</p>
                      </div>
                      <span className="font-semibold">{formatCurrency(customer.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function formatRangeLabel(startIso: string, endIso: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const start = formatter.format(new Date(startIso));
  const end = formatter.format(new Date(endIso));
  return `${start} – ${end}`;
}
