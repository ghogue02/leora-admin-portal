'use client';

import { useEffect, useState } from 'react';
import { formatUTCDate } from '@/lib/dates';

type DrilldownType =
  | 'top-customers'
  | 'top-products'
  | 'customer-risk'
  | 'monthly-trend'
  | 'samples'
  | 'order-status'
  | 'recent-activity'
  | null;

type DrilldownData = {
  title: string;
  description: string;
  data: any;
  columns: Array<{
    key: string;
    label: string;
    format?: (value: any) => string;
  }>;
  charts?: {
    type: 'bar' | 'line' | 'pie';
    data: any;
  };
};

type DrilldownModalProps = {
  type: DrilldownType;
  onClose: () => void;
  tenantId?: string;
};

export function DrilldownModal({ type, onClose, tenantId }: DrilldownModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DrilldownData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type) {
      fetchDrilldownData(type);
    }
  }, [type]);

  const fetchDrilldownData = async (drilldownType: DrilldownType) => {
    if (!drilldownType) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/sales/insights/drilldown?type=${drilldownType}`);

      if (!response.ok) {
        throw new Error('Failed to load detailed data');
      }

      const drilldownData = await response.json();
      setData(drilldownData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? 'Loading...' : data?.title ?? 'Details'}
              </h2>
              {data?.description && (
                <p className="mt-1 text-sm text-gray-600">{data.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Summary Stats */}
              {data.data.summary && (
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(data.data.summary).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {typeof value === 'number' && key.toLowerCase().includes('revenue')
                          ? `$${value.toLocaleString()}`
                          : typeof value === 'number'
                          ? value.toLocaleString()
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Table */}
              {data.data.items && data.columns && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {data.columns.map((column) => (
                          <th
                            key={column.key}
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.data.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {data.columns.map((column) => (
                            <td key={column.key} className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {column.format
                                ? column.format(item[column.key])
                                : item[column.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Chart Visualization */}
              {data.data.chartData && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">Visualization</h3>
                  {data.data.chartData.type === 'bar' && (
                    <BarChart data={data.data.chartData.data} />
                  )}
                  {data.data.chartData.type === 'line' && (
                    <LineChart data={data.data.chartData.data} />
                  )}
                  {data.data.chartData.type === 'pie' && (
                    <PieChart data={data.data.chartData.data} />
                  )}
                </div>
              )}

              {/* Insights/Analysis */}
              {data.data.insights && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">💡 Insights</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    {data.data.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-0.5 text-blue-600">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                // Export to CSV functionality
                if (data?.data.items) {
                  exportToCSV(data.data.items, data.columns, data.title);
                }
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              📥 Export to CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Bar Chart Component
function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-700">{item.label}</div>
          <div className="flex-1">
            <div className="h-8 rounded-lg bg-gray-200">
              <div
                className="h-full rounded-lg bg-indigo-600 transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-24 text-right text-sm font-semibold text-gray-900">
            {typeof item.value === 'number' && item.value > 1000
              ? `$${item.value.toLocaleString()}`
              : item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple Line Chart Component (Using ASCII art style)
function LineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <div className="space-y-2">
      <div className="relative h-64 border-l-2 border-b-2 border-gray-300 pl-4 pb-4">
        {data.map((item, idx) => {
          const height = range > 0 ? ((item.value - minValue) / range) * 100 : 50;
          return (
            <div
              key={idx}
              className="absolute bottom-0 flex flex-col items-center"
              style={{
                left: `${(idx / (data.length - 1)) * 90 + 5}%`,
                height: `${height}%`
              }}
            >
              <div className="relative w-2 flex-1 bg-indigo-600 rounded-t">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-gray-900">
                  {typeof item.value === 'number' && item.value > 1000
                    ? `$${(item.value / 1000).toFixed(1)}k`
                    : item.value}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple Pie Chart Component
function PieChart({ data }: { data: Array<{ label: string; value: number; color?: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['bg-indigo-600', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500'];

  return (
    <div className="flex items-center gap-8">
      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((item, idx) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded ${item.color ?? colors[idx % colors.length]}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {percentage}% ({item.value})
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual representation */}
      <div className="flex h-48 w-48 items-center justify-center rounded-full border-8 border-gray-200 bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
    </div>
  );
}

// Export to CSV helper
function exportToCSV(items: any[], columns: any[], filename: string) {
  const headers = columns.map((col) => col.label).join(',');
  const rows = items.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      // Escape commas and quotes in CSV
      const formatted = col.format ? col.format(value) : value;
      return `"${String(formatted).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-${formatUTCDate(new Date())}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
