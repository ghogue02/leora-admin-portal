'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type CustomerSignalBucket = {
  classification: string;
  count: number;
  percentOfActive: number;
  revenueShare: number;
};

type CustomerHealthResponse = {
  coverage: {
    assigned: number;
    active: number;
    targets: number;
    prospects: number;
  };
  signals: {
    buckets: Record<string, CustomerSignalBucket>;
    totals: {
      assigned: number;
      active: number;
    };
  };
  customers: Array<{
    customerId: string;
    name: string;
    classification: string;
    trailingTwelveRevenue: number;
    daysSinceLastOrder: number | null;
  }>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function CustomerHealthPanel() {
  const [data, setData] = useState<CustomerHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sales/reports/customer-health', { cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Unable to load customer health');
        }
        const payload = (await response.json()) as CustomerHealthResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load customer health');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return <Skeleton className="h-[320px] w-full" />;
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

  const buckets = Object.values(data.signals.buckets ?? {});
  const atRiskCustomers = data.customers
    .filter((customer) => customer.classification === 'atRisk' || customer.classification === 'dormant')
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Territory health snapshot</CardTitle>
          <p className="text-sm text-slate-500">Live breakdown of coverage, risk buckets, and top at-risk accounts.</p>
        </div>
        <Link
          href="/api/sales/reports/customer-health?format=csv"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          Download CSV
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Assigned" value={data.coverage.assigned.toLocaleString()} />
          <Stat label="Active" value={data.coverage.active.toLocaleString()} />
          <Stat label="Targets" value={data.coverage.targets.toLocaleString()} />
          <Stat label="Prospects" value={data.coverage.prospects.toLocaleString()} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-600 mb-3">Signal buckets</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {buckets.map((bucket) => (
              <div key={bucket.classification} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{bucket.classification}</p>
                <p className="text-2xl font-semibold text-slate-900">{bucket.count}</p>
                <p className="text-xs text-slate-500">
                  {bucket.percentOfActive.toFixed(0)}% of active • {bucket.revenueShare.toFixed(1)}% revenue
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-600 mb-3">Accounts needing attention</p>
          {atRiskCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">No at-risk customers right now 🎉</p>
          ) : (
            <div className="space-y-2">
              {atRiskCustomers.map((customer) => (
                <div
                  key={customer.customerId}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500">
                      {customer.daysSinceLastOrder ?? '—'} days since last order
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrency(customer.trailingTwelveRevenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
