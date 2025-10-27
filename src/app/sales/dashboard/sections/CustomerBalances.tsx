'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { DashboardTile } from '@/components/dashboard/DashboardTile';
import type { DashboardDrilldownType } from '@/types/drilldown';

type AgingBucket = {
  range: string;
  count: number;
  amount: number;
};

type CustomerBalancesData = {
  total: number;
  totalCustomers: number;
  buckets: AgingBucket[];
  criticalCount: number; // 90+ days
};

type CustomerBalancesProps = {
  onDrilldown?: (type: DashboardDrilldownType) => void;
};

export default function CustomerBalances({ onDrilldown }: CustomerBalancesProps) {
  const [data, setData] = useState<CustomerBalancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/sales/dashboard/customer-balances', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load customer balances');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <DashboardTile
        drilldownType="past-due"
        title="Past Due Balances"
        onClick={() => onDrilldown?.('past-due' as DashboardDrilldownType)}
      >
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </DashboardTile>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-700">Unable to load balances: {error}</p>
      </div>
    );
  }

  const hasCriticalBalances = data.criticalCount > 0;

  return (
    <DashboardTile
      drilldownType="past-due"
      title="Past Due Balances"
      onClick={() => onDrilldown?.('past-due' as DashboardDrilldownType)}
    >
      <div className={`rounded-lg border p-6 shadow-sm ${hasCriticalBalances ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className={`h-5 w-5 ${hasCriticalBalances ? 'text-red-600' : 'text-gray-600'}`} />
            <p className={`text-xs font-medium uppercase tracking-widest ${hasCriticalBalances ? 'text-red-700' : 'text-gray-500'}`}>
              Past Due
            </p>
          </div>
          {hasCriticalBalances && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
              <AlertTriangle className="h-3 w-3" />
              {data.criticalCount} Critical
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className={`text-3xl font-semibold ${hasCriticalBalances ? 'text-red-900' : 'text-gray-900'}`}>
            {formatCurrency(data.total)}
          </p>
          <p className={`mt-1 text-xs ${hasCriticalBalances ? 'text-red-600' : 'text-gray-500'}`}>
            {data.totalCustomers} customer{data.totalCustomers === 1 ? '' : 's'} with balance
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {data.buckets.map((bucket) => {
            const isOverdue90 = bucket.range.startsWith('90+');
            return (
              <div
                key={bucket.range}
                className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                  isOverdue90
                    ? 'border-red-300 bg-red-100'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOverdue90 && <Clock className="h-4 w-4 text-red-600" />}
                  <span className={`font-medium ${isOverdue90 ? 'text-red-900' : 'text-gray-700'}`}>
                    {bucket.range} days
                  </span>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${isOverdue90 ? 'text-red-900' : 'text-gray-900'}`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className={`text-xs ${isOverdue90 ? 'text-red-600' : 'text-gray-500'}`}>
                    {bucket.count} invoice{bucket.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {data.total === 0 && (
          <div className="py-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-green-300" />
            <p className="mt-2 text-sm font-medium text-green-700">All caught up!</p>
            <p className="text-xs text-green-600">No past due balances</p>
          </div>
        )}
      </div>
    </DashboardTile>
  );
}
