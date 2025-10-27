'use client';

import { useEffect, useState } from 'react';
import { UserPlus, TrendingUp } from 'lucide-react';
import { DashboardTile } from '@/components/dashboard/DashboardTile';
import type { DashboardDrilldownType } from '@/types/drilldown';

type NewCustomersData = {
  thisWeek: number;
  thisMonth: number;
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  customers: Array<{
    id: string;
    name: string;
    firstOrderDate: string;
    firstOrderAmount: number;
  }>;
};

type NewCustomersMetricProps = {
  onDrilldown?: (type: DashboardDrilldownType) => void;
};

export default function NewCustomersMetric({ onDrilldown }: NewCustomersMetricProps) {
  const [data, setData] = useState<NewCustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/sales/dashboard/new-customers', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load new customers');
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
        drilldownType="new-customers"
        title="New Customers"
        onClick={() => onDrilldown?.('new-customers' as DashboardDrilldownType)}
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
        <p className="text-sm text-red-700">Unable to load new customers: {error}</p>
      </div>
    );
  }

  const hasNewCustomers = data.thisWeek > 0 || data.thisMonth > 0;

  return (
    <DashboardTile
      drilldownType="new-customers"
      title="New Customers"
      onClick={() => onDrilldown?.('new-customers' as DashboardDrilldownType)}
    >
      <div className={`rounded-lg border p-6 shadow-sm ${hasNewCustomers ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <UserPlus className={`h-5 w-5 ${hasNewCustomers ? 'text-green-600' : 'text-gray-500'}`} />
          <p className={`text-xs font-medium uppercase tracking-widest ${hasNewCustomers ? 'text-green-700' : 'text-gray-500'}`}>
            New Customers
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className={`text-xs ${hasNewCustomers ? 'text-green-600' : 'text-gray-500'}`}>This Month</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className={`text-3xl font-semibold ${hasNewCustomers ? 'text-green-900' : 'text-gray-900'}`}>
                {data.thisWeek}
              </p>
              {data.thisWeek > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                  <TrendingUp className="h-3 w-3" />
                  New
                </span>
              )}
            </div>
          </div>

          <div>
            <p className={`text-xs ${hasNewCustomers ? 'text-green-600' : 'text-gray-500'}`}>This Month</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className={`text-3xl font-semibold ${hasNewCustomers ? 'text-green-900' : 'text-gray-900'}`}>
                {data.thisMonth}
              </p>
            </div>
          </div>
        </div>

        {data.customers.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-green-200 pt-4">
            <p className="text-xs font-semibold text-green-700">Recent Wins:</p>
            {data.customers.slice(0, 3).map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between rounded-md border border-green-200 bg-white p-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(customer.firstOrderDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold text-green-700">
                  {formatCurrency(customer.firstOrderAmount)}
                </p>
              </div>
            ))}
            {data.customers.length > 3 && (
              <p className="text-center text-xs text-green-600">
                +{data.customers.length - 3} more
              </p>
            )}
          </div>
        )}

        {!hasNewCustomers && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">No new customers yet</p>
            <p className="text-xs text-gray-400">Keep prospecting!</p>
          </div>
        )}
      </div>
    </DashboardTile>
  );
}
