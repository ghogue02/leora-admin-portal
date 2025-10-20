'use client';

import { useEffect, useState } from 'react';

type ProductGoal = {
  id: string;
  skuId: string | null;
  productName: string;
  productCategory: string | null;
  annualGoal: number;
  ytdSales: number;
  progressPct: number;
  expectedPct: number;
  status: 'on_track' | 'at_risk' | 'behind';
  onTrack: boolean;
};

type ProductGoalsData = {
  goals: ProductGoal[];
  summary: {
    totalGoals: number;
    onTrack: number;
    atRisk: number;
    behind: number;
  };
};

export default function ProductGoals() {
  const [data, setData] = useState<ProductGoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductGoals() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/sales/goals/products', {
          cache: 'no-store',
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load product goals');
        }

        const goalsData = (await response.json()) as ProductGoalsData;
        setData(goalsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product goals');
      } finally {
        setLoading(false);
      }
    }

    void loadProductGoals();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-700">{error ?? 'Unable to load product goals'}</p>
      </section>
    );
  }

  const { goals, summary } = data;

  if (goals.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Product Goals</h3>
        <p className="mt-2 text-sm text-gray-500">No product goals configured for this year.</p>
      </section>
    );
  }

  // Get top 3 performers (on_track products with highest progress %)
  const topPerformers = goals
    .filter((g) => g.status === 'on_track')
    .sort((a, b) => b.progressPct - a.progressPct)
    .slice(0, 3)
    .map((g) => g.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return {
          bg: 'bg-green-100',
          border: 'border-green-200',
          text: 'text-green-700',
          bar: 'bg-green-600',
        };
      case 'at_risk':
        return {
          bg: 'bg-amber-100',
          border: 'border-amber-200',
          text: 'text-amber-700',
          bar: 'bg-amber-600',
        };
      case 'behind':
        return {
          bg: 'bg-rose-100',
          border: 'border-rose-200',
          text: 'text-rose-700',
          bar: 'bg-rose-600',
        };
      default:
        return {
          bg: 'bg-slate-100',
          border: 'border-slate-200',
          text: 'text-slate-700',
          bar: 'bg-slate-600',
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'behind':
        return 'Behind';
      default:
        return status;
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Goals</h3>
          <p className="text-xs text-gray-500">Year-to-date progress on product targets</p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">On Track:</span>
            <span className="font-semibold text-green-700">{summary.onTrack}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">At Risk:</span>
            <span className="font-semibold text-amber-700">{summary.atRisk}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Behind:</span>
            <span className="font-semibold text-rose-700">{summary.behind}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const colors = getStatusColor(goal.status);
          const isTopPerformer = topPerformers.includes(goal.id);
          const needsAttention = goal.status === 'behind';

          return (
            <div
              key={goal.id}
              className={`rounded-lg border p-4 ${colors.border} ${colors.bg}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{goal.productName}</h4>
                    {isTopPerformer && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Top Performer
                      </span>
                    )}
                    {needsAttention && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-xs font-medium text-white">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Needs Attention
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2 text-sm">
                    <span className="font-medium text-gray-700">
                      {formatCurrency(goal.ytdSales)}
                    </span>
                    <span className="text-gray-500">of</span>
                    <span className="text-gray-700">{formatCurrency(goal.annualGoal)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium uppercase ${colors.text}`}>
                    {getStatusLabel(goal.status)}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {goal.progressPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="relative h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full transition-all ${colors.bar}`}
                  style={{ width: `${Math.min(goal.progressPct, 100)}%` }}
                />
                {/* Expected progress marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-gray-900 opacity-30"
                  style={{ left: `${Math.min(goal.expectedPct, 100)}%` }}
                  title={`Expected: ${goal.expectedPct.toFixed(0)}%`}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                <span>YTD Progress</span>
                <span>Expected: {goal.expectedPct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
