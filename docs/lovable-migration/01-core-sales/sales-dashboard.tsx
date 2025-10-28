/**
 * LOVABLE MIGRATION - Sales Dashboard Component
 *
 * This is a simplified version of the sales dashboard for Lovable.
 * Original: /src/app/sales/dashboard/page.tsx
 *
 * SETUP INSTRUCTIONS:
 * 1. Install dependencies: lucide-react, date-fns
 * 2. Create API endpoint: /api/sales/dashboard
 * 3. Set up Supabase authentication
 * 4. Configure database schema (see package 02-database-api)
 */

'use client';

import { useCallback, useEffect, useState } from "react";
import { Calendar, TrendingUp, Users, AlertCircle } from "lucide-react";

type DashboardData = {
  salesRep: {
    id: string;
    name: string;
    territory: string;
    weeklyQuota: number;
  };
  metrics: {
    currentWeek: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastWeek: {
      revenue: number;
    };
    comparison: {
      revenueChange: number;
      revenueChangePercent: string;
    };
  };
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    total: number;
  };
  customersDue: Array<{
    id: string;
    name: string;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    daysOverdue: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
  }>;
};

export default function SalesDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sales/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sales/login";
          return;
        }
        throw new Error("Unable to load dashboard");
      }

      const payload = await response.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-medium">Error loading dashboard</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { salesRep, metrics, customerHealth, customersDue, tasks } = data;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {salesRep.name} • {salesRep.territory}
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Weekly Revenue"
          value={`$${metrics.currentWeek.revenue.toLocaleString()}`}
          change={metrics.comparison.revenueChangePercent}
          icon={<TrendingUp className="w-5 h-5" />}
          quota={salesRep.weeklyQuota}
          progress={metrics.currentWeek.quotaProgress}
        />

        <MetricCard
          title="Unique Customers"
          value={metrics.currentWeek.uniqueCustomers.toString()}
          icon={<Users className="w-5 h-5" />}
        />

        <MetricCard
          title="Customer Health"
          value={`${customerHealth.healthy}/${customerHealth.total}`}
          subtitle={`${customerHealth.atRiskCadence + customerHealth.atRiskRevenue} at risk`}
          icon={<AlertCircle className="w-5 h-5" />}
        />
      </div>

      {/* Customers Due */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Customers Due to Order
        </h2>
        <div className="space-y-3">
          {customersDue.slice(0, 5).map(customer => (
            <div key={customer.id} className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-600">
                  {customer.daysOverdue > 0
                    ? `${customer.daysOverdue} days overdue`
                    : 'Due soon'}
                </p>
              </div>
              <a
                href={`/sales/customers/${customer.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Pending Tasks
        </h2>
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="py-2 border-b border-gray-100">
              <p className="font-medium text-gray-900">{task.title}</p>
              {task.dueAt && (
                <p className="text-sm text-gray-600">
                  Due: {new Date(task.dueAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Supporting Component
function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  quota,
  progress
}: {
  title: string;
  value: string;
  change?: string;
  subtitle?: string;
  icon: React.ReactNode;
  quota?: number;
  progress?: number;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="text-gray-400">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={`text-sm mt-1 ${parseFloat(change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {parseFloat(change) >= 0 ? '+' : ''}{change}% vs last week
        </p>
      )}
      {subtitle && (
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      )}
      {progress !== undefined && quota && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {progress.toFixed(0)}% of ${quota.toLocaleString()} quota
          </p>
        </div>
      )}
    </div>
  );
}
