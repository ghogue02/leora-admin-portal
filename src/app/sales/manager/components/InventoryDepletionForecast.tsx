'use client';

import { useState, useEffect } from 'react';
import type { DepletionForecast, DepletionSummary, DepletionUrgency } from '@/types/inventory-forecast';
import { formatDaysUntilStockout, formatStockoutDate } from '@/lib/inventory/depletion-forecast';
import { InfoHover } from '@/components/InfoHover';
import { Download, AlertTriangle, Clock, TrendingDown } from 'lucide-react';

type InventoryForecastResponse = {
  forecasts: DepletionForecast[];
  summary: DepletionSummary;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const urgencyConfig: Record<DepletionUrgency, { label: string; color: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-red-600', icon: '🔴' },
  warning: { label: 'Warning', color: 'text-yellow-600', icon: '🟡' },
  normal: { label: 'Normal', color: 'text-blue-600', icon: '🔵' },
  stable: { label: 'Stable', color: 'text-green-600', icon: '🟢' },
  infinite: { label: 'No Demand', color: 'text-gray-400', icon: '⚪' },
};

export default function InventoryDepletionForecast() {
  const [data, setData] = useState<InventoryForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');

  useEffect(() => {
    loadForecasts();
  }, [categoryFilter, brandFilter, urgencyFilter]);

  const loadForecasts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (brandFilter) params.set('brand', brandFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);

      const response = await fetch(`/api/sales/manager/inventory-forecast?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load inventory forecasts');
      }

      const result = await response.json() as InventoryForecastResponse;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecasts');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data?.forecasts.length) return;

    const headers = [
      'SKU Code',
      'Product Name',
      'Brand',
      'Category',
      'Available',
      'On Hand',
      'Allocated',
      'Velocity (30d)',
      'Velocity (60d)',
      'Velocity (90d)',
      'Velocity (180d)',
      'Velocity (360d)',
      'Days Until Stockout',
      'Projected Stockout Date',
      'Urgency',
      'Demand Pattern',
      'Confidence',
    ];

    const rows = data.forecasts.map(f => [
      f.skuCode,
      f.productName,
      f.brand || '',
      f.category || '',
      f.currentAvailable,
      f.onHand,
      f.allocated,
      f.velocities.day30.unitsPerDay.toFixed(2),
      f.velocities.day60.unitsPerDay.toFixed(2),
      f.velocities.day90.unitsPerDay.toFixed(2),
      f.velocities.day180.unitsPerDay.toFixed(2),
      f.velocities.day360.unitsPerDay.toFixed(2),
      f.daysUntilStockout ?? 'No demand',
      f.stockoutDate ? f.stockoutDate.toISOString().split('T')[0] : '—',
      f.urgency,
      f.demandPattern,
      f.confidenceLevel,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-depletion-forecast-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Calculating inventory forecasts...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">Failed to load inventory forecasts</p>
        <p className="mt-1 text-sm text-red-700">{error || 'Unknown error'}</p>
        <button
          onClick={loadForecasts}
          className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const { forecasts, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Depletion Forecast</h2>
          <p className="text-sm text-gray-600">Predicts when products will run out based on sales velocity</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={!forecasts.length}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard
          label="Total SKUs"
          value={summary.totalSKUs}
          icon={<TrendingDown className="h-5 w-5 text-gray-500" />}
          color="gray"
        />
        <SummaryCard
          label="Critical"
          value={summary.criticalCount}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          color="red"
          subtitle="< 30 days"
        />
        <SummaryCard
          label="Warning"
          value={summary.warningCount}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          color="yellow"
          subtitle="30-60 days"
        />
        <SummaryCard
          label="Normal"
          value={summary.normalCount}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          color="blue"
          subtitle="60-90 days"
        />
        <SummaryCard
          label="Stable"
          value={summary.stableCount}
          icon={<Clock className="h-5 w-5 text-green-500" />}
          color="green"
          subtitle="> 90 days"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="Wine - Red">Red Wine</option>
            <option value="Wine - White">White Wine</option>
            <option value="Wine - Rosé">Rosé</option>
            <option value="Wine - Sparkling">Sparkling</option>
            <option value="Spirits">Spirits</option>
            <option value="Beer">Beer</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Urgency:</span>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="critical">Critical Only (&lt; 30 days)</option>
            <option value="warning">Warning Only (30-60 days)</option>
            <option value="critical,warning">Critical + Warning</option>
          </select>
        </label>

        {(categoryFilter || brandFilter || urgencyFilter) && (
          <button
            onClick={() => {
              setCategoryFilter('');
              setBrandFilter('');
              setUrgencyFilter('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Forecasts Table */}
      {forecasts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-gray-600">No forecasts match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Available
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <div className="flex items-center justify-end gap-1">
                      Days Left
                      <InfoHover
                        text="Based on 90-day sales velocity. Hover over row for all timeframes."
                        label="Days until stockout"
                        align="left"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Stockout Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Velocity (90d)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {forecasts.map((forecast) => (
                  <ForecastRow key={forecast.skuId} forecast={forecast} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination info */}
      {data.pagination.total > 0 && (
        <p className="text-sm text-gray-500">
          Showing {Math.min(data.pagination.limit, forecasts.length)} of {data.pagination.total} SKUs
        </p>
      )}
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'gray' | 'red' | 'yellow' | 'blue' | 'green';
  subtitle?: string;
};

function SummaryCard({ label, value, icon, color, subtitle }: SummaryCardProps) {
  const colorClasses = {
    gray: 'border-gray-200 bg-gray-50',
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {icon}
      </div>
    </div>
  );
}

type ForecastRowProps = {
  forecast: DepletionForecast;
};

function ForecastRow({ forecast }: ForecastRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const config = urgencyConfig[forecast.urgency];

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer transition"
        onClick={() => setShowDetails(!showDetails)}
      >
        <td className="px-4 py-3">
          <span className="text-lg" title={config.label}>
            {config.icon}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-sm font-medium text-gray-900">{forecast.skuCode}</span>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-gray-900">{forecast.productName}</p>
            {forecast.brand && <p className="text-xs text-gray-500">{forecast.brand}</p>}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-gray-900">{forecast.currentAvailable}</span>
          <p className="text-xs text-gray-500">units</p>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`font-bold ${config.color}`}>
            {formatDaysUntilStockout(forecast.daysUntilStockout)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700">
            {formatStockoutDate(forecast.stockoutDate)}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-medium text-gray-900">
            {forecast.primaryVelocity.unitsPerDay.toFixed(1)} /day
          </span>
        </td>
      </tr>

      {/* Expandable details row */}
      {showDetails && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* All velocity timeframes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                  Velocity Trends
                </p>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-600">
                      <th className="text-left">Period</th>
                      <th className="text-right">Units/Day</th>
                      <th className="text-right">Total Sales</th>
                      <th className="text-right">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.values(forecast.velocities).map((v) => (
                      <tr key={v.period}>
                        <td className="py-1">{v.periodLabel}</td>
                        <td className="py-1 text-right font-medium">{v.unitsPerDay.toFixed(2)}</td>
                        <td className="py-1 text-right">{v.totalUnits}</td>
                        <td className="py-1 text-right">
                          {v.daysUntilStockout !== null ? v.daysUntilStockout : '∞'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inventory breakdown */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                  Inventory Status
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">On Hand:</span>
                    <span className="font-medium">{forecast.onHand} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allocated:</span>
                    <span className="font-medium">-{forecast.allocated} units</span>
                  </div>
                  {forecast.reserved > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reserved:</span>
                      <span className="font-medium">-{forecast.reserved} units</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-2">
                    <span className="font-semibold text-gray-900">Available:</span>
                    <span className="font-bold text-gray-900">{forecast.currentAvailable} units</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-gray-700">
                      {forecast.demandPattern} demand
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-gray-700">
                      {forecast.confidenceLevel} confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
