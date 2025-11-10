'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportFilters } from '../_context/ReportFiltersContext';

type EventSalesRow = {
  eventType: string;
  customerCount: number;
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
};

type EventSalesResponse = {
  report: EventSalesRow[];
  summary: {
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    avgRevenuePerCustomer: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function EventMixPanel() {
  const { queryParams } = useReportFilters();
  const [data, setData] = useState<EventSalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramKey = useMemo(() => {
    const params = new URLSearchParams();
    if (queryParams.startDate) params.set('startDate', queryParams.startDate);
    if (queryParams.endDate) params.set('endDate', queryParams.endDate);
    return params.toString();
  }, [queryParams]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (queryParams.startDate) params.set('startDate', queryParams.startDate);
        if (queryParams.endDate) params.set('endDate', queryParams.endDate);
        const qs = params.toString();
        const response = await fetch(
          qs ? `/api/sales/reports/event-sales?${qs}` : '/api/sales/reports/event-sales',
          { cache: 'no-store' },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Unable to load event mix');
        }
        const payload = (await response.json()) as EventSalesResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load event mix');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paramKey, queryParams]);

  if (loading) {
    return <Skeleton className="h-[360px] w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event-driven revenue mix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Customers" value={data.summary.totalCustomers.toLocaleString()} subLabel="Participating in events" />
          <Kpi label="Orders" value={data.summary.totalOrders.toLocaleString()} subLabel="Attributed to events" />
          <Kpi label="Revenue" value={formatCurrency(data.summary.totalRevenue)} subLabel="Event-sourced" />
          <Kpi
            label="Avg per customer"
            value={formatCurrency(data.summary.avgRevenuePerCustomer)}
            subLabel="Event revenue / customer"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event type</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg order value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.report.map((row) => (
                <TableRow key={row.eventType}>
                  <TableCell className="font-medium">{row.eventType}</TableCell>
                  <TableCell className="text-right">{Number(row.customerCount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(row.orderCount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.avgOrderValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, subLabel }: { label: string; value: string; subLabel: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{subLabel}</p>
    </div>
  );
}
