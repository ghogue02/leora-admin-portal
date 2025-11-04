'use client';

import { useEffect, useState } from 'react';
import { format as formatDate, isValid, parseISO } from 'date-fns';
import type {
  DrilldownType,
  DrilldownData,
  DrilldownModalProps,
} from '@/types/drilldown';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format';

// Helper function to get appropriate icon for insight
function getInsightIcon(key: string, value: any): string {
  const keyLower = key.toLowerCase();
  const valueStr = String(value).toLowerCase();

  // Rate or progress indicators
  if (keyLower.includes('rate') || keyLower.includes('progress') || keyLower.includes('quota')) {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isNaN(numValue)) {
      return numValue >= 80 ? '✅' : numValue >= 50 ? '⚠️' : '🔴';
    }
  }

  // Momentum or trend indicators
  if (keyLower.includes('momentum') || keyLower.includes('change') || keyLower.includes('growth')) {
    if (valueStr.includes('ahead') || valueStr.includes('above') || valueStr.includes('up') || valueStr.includes('increase')) {
      return '🚀';
    }
    if (valueStr.includes('below') || valueStr.includes('behind') || valueStr.includes('down') || valueStr.includes('decrease')) {
      return '⚠️';
    }
    return '📊';
  }

  // Peak or top indicators
  if (keyLower.includes('peak') || keyLower.includes('top') || keyLower.includes('best')) {
    return '🏆';
  }

  // Customer or count related
  if (keyLower.includes('customer') || keyLower.includes('unique')) {
    return '👥';
  }

  // Revenue or money related
  if (keyLower.includes('revenue') || keyLower.includes('contribution') || keyLower.includes('value')) {
    return '💰';
  }

  // Diversity or variety
  if (keyLower.includes('diversity') || keyLower.includes('variety') || keyLower.includes('category')) {
    return '📊';
  }

  // Default bullet
  return '•';
}

// Helper function to format insight keys into readable labels
function formatInsightKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

// Helper function to format insight values
function formatInsightValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    // Handle nested objects (like peakRevenueDay)
    return Object.entries(value)
      .map(([k, v]) => `${formatInsightKey(k)}: ${v}`)
      .join(', ');
  }
  return String(value);
}

export function DrilldownModal({
  type,
  onClose,
  tenantId,
  apiEndpoint = '/api/sales/insights/drilldown'
}: DrilldownModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DrilldownData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type) {
      fetchDrilldownData(type);
    }
  }, [type, apiEndpoint]);

  const fetchDrilldownData = async (drilldownType: DrilldownType) => {
    if (!drilldownType) return;

    try {
      setLoading(true);
      setError(null);

      // Determine correct endpoint based on drill-down type
      const dashboardTypes = [
        'weekly-quota', 'this-week-revenue', 'last-week-revenue', 'unique-customers',
        'mtd-revenue', 'ytd-revenue', 'all-time-revenue', 'last-month-revenue',
        'customer-health', 'at-risk-cadence', 'at-risk-revenue', 'dormant-customers',
        'healthy-customers', 'customers-due', 'upcoming-events', 'pending-tasks',
        'prospect-customers', 'prospect-cold'
      ];

      const isDashboardType = dashboardTypes.includes(drilldownType);
      const endpoint = isDashboardType
        ? `/api/sales/dashboard/drilldown/${drilldownType}`
        : `${apiEndpoint}?type=${drilldownType}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load detailed data');
      }

      const drilldownData = await response.json();
      setData(drilldownData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format drilldown titles
  const formatDrilldownTitle = (drilldownType: string): string => {
    const titles: Record<string, string> = {
      'weekly-quota': 'Monthly Quota Progress',
      'this-week-revenue': 'This Week Revenue',
      'last-week-revenue': 'Last Week Revenue',
      'unique-customers': 'Unique Customers',
      'mtd-revenue': 'Month-to-Date Revenue',
      'ytd-revenue': 'Year-to-Date Revenue',
      'all-time-revenue': 'All-Time Revenue',
      'customer-health': 'Customer Health Summary',
      'at-risk-cadence': 'At Risk Customers (Cadence)',
      'at-risk-revenue': 'At Risk Customers (Revenue)',
      'dormant-customers': 'Dormant Customers',
      'healthy-customers': 'Healthy Customers',
      'customers-due': 'Customers Due',
      'upcoming-events': 'Upcoming Events',
      'pending-tasks': 'Pending Tasks',
    };
    return titles[drilldownType] || 'Details';
  };

  if (!type) return null;

  const formatDateString = (value: string): string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }
    const parsed = parseISO(value);
    if (!isValid(parsed)) {
      return value;
    }
    return formatDate(parsed, 'dd/MM/yy');
  };

  const renderArrayValue = (items: any[]): JSX.Element => {
    if (!items.length) {
      return <span className="text-gray-400">—</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {items.map((entry, index) => {
          if (entry && typeof entry === 'object') {
            const orderId = entry.id ?? entry.orderId ?? index;
            const formattedDate =
              typeof entry.deliveredAt === 'string'
                ? formatDateString(entry.deliveredAt)
                : entry.deliveredAt ?? '';
            const amount =
              typeof entry.total === 'number' && entry.total > 0
                ? formatCurrency(entry.total)
                : undefined;
            const explicitLabel =
              typeof entry.label === 'string' ? entry.label : undefined;
            const truncatedId =
              entry.id
                ? `#${String(entry.id).slice(0, 6)}`
                : undefined;
            const parts = [formattedDate, amount, explicitLabel, truncatedId].filter(Boolean);
            const displayText = parts.join(' • ') || `Order ${orderId}`;
            const href = entry.href ?? (entry.id ? `/sales/orders/${entry.id}` : undefined);
            const key = `${orderId}-${index}`;

            return href ? (
              <a
                key={key}
                href={href}
                className="text-indigo-600 hover:underline"
              >
                {displayText}
              </a>
            ) : (
              <span key={key}>{displayText}</span>
            );
          }

          return (
            <span key={index}>
              {typeof entry === 'string' ? formatDateString(entry) : String(entry)}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? 'Loading...' : data?.title ?? formatDrilldownTitle(type)}
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
            <div className="space-y-6">
              {/* Summary Stats Skeleton */}
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse"></div>
                    <div className="mt-3 h-8 w-32 rounded bg-gray-300 animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Table Header Skeleton */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="h-4 w-32 rounded bg-gray-300 animate-pulse"></div>
                </div>

                {/* Table Content Skeleton */}
                <div className="bg-white">
                  {/* Table Headers */}
                  <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-6 py-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1">
                        <div className="h-3 w-20 rounded bg-gray-300 animate-pulse"></div>
                      </div>
                    ))}
                  </div>

                  {/* Table Rows */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 border-b border-gray-100 px-6 py-4">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex-1">
                          <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights Skeleton */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-3 h-4 w-24 rounded bg-blue-300 animate-pulse"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-300 animate-pulse"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-full rounded bg-blue-200 animate-pulse"></div>
                        <div className="h-3 w-3/4 rounded bg-blue-200 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
              {data.summary && (
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(data.summary).map(([key, value]) => {
                    const keyLabel = key.replace(/([A-Z])/g, ' $1').trim();
                    const keyLower = key.toLowerCase();

                    const formattedNumber = (numericValue: number): string => {
                      if (keyLower.includes('revenue') || keyLower.includes('amount') || keyLower.includes('value')) {
                        return formatCurrency(numericValue);
                      }

                      if (
                        keyLower.includes('percent') ||
                        keyLower.includes('rate') ||
                        keyLower.includes('ratio') ||
                        keyLower.includes('conversion')
                      ) {
                        return formatPercentage(numericValue);
                      }

                      return formatNumber(numericValue);
                    };

                    return (
                      <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase text-gray-500">{keyLabel}</p>
                        <div className="mt-1">
                          {typeof value === 'number' ? (
                            <p className="text-2xl font-bold text-gray-900">{formattedNumber(value)}</p>
                          ) : typeof value === 'object' && value !== null ? (
                            <div className="space-y-1">
                              {Object.entries(value).map(([k, v]) => (
                                <div key={k} className="text-sm">
                                  <span className="font-semibold">{formatInsightKey(k)}:</span>{' '}
                                  {typeof v === 'number' ? formattedNumber(v) : String(v)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Data Completeness Indicator */}
              {data.metadata?.dataCompleteness && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">📊 Data Coverage:</span>
                    <span>{data.metadata.dataCompleteness.message}</span>
                    {data.metadata.dataCompleteness.showing &&
                      data.metadata.dataCompleteness.total && (
                        <span className="ml-auto text-xs text-gray-500">
                          (
                          {formatPercentage(
                            (Number(data.metadata.dataCompleteness.showing) /
                              Number(data.metadata.dataCompleteness.total)) *
                              100
                          )}{' '}
                          complete)
                        </span>
                      )}
                  </div>
                </div>
              )}

              {/* Data Display - Render based on what's available in response */}
              {data.data && (
                <div className="space-y-6">
                  {/* Render any arrays of data as tables */}
                  {Object.entries(data.data).map(([key, value]) => {
                    // Skip non-array data
                    if (!Array.isArray(value) || value.length === 0) return null;

                    // Skip certain keys that are better shown differently
                    if (['insights', 'chartData'].includes(key)) return null;

                    return (
                      <div key={key} className="overflow-hidden rounded-lg border border-gray-200">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {Object.keys(value[0] || {}).map((colKey) => (
                                  <th
                                    key={colKey}
                                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                  >
                                    {colKey.replace(/([A-Z])/g, ' $1').trim()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {value.slice(0, 20).map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  {Object.entries(item).map(([cellKey, cellValue]: [string, any]) => {
                                    const cellKeyLower = cellKey.toLowerCase();
                                    const formatCellNumber = (numericValue: number): string => {
                                      if (
                                        cellKeyLower.includes('revenue') ||
                                        cellKeyLower.includes('amount') ||
                                        cellKeyLower.includes('total') ||
                                        cellKeyLower.includes('value')
                                      ) {
                                        return formatCurrency(numericValue);
                                      }

                                      if (
                                        cellKeyLower.includes('percent') ||
                                        cellKeyLower.includes('rate') ||
                                        cellKeyLower.includes('ratio')
                                      ) {
                                        return formatPercentage(numericValue);
                                      }

                                      return formatNumber(numericValue);
                                    };

                                  return (
                                      <td key={cellKey} className="px-6 py-4 text-sm text-gray-900">
                                        {Array.isArray(cellValue) ? (
                                          renderArrayValue(cellValue)
                                        ) : typeof cellValue === 'number' ? (
                                          formatCellNumber(cellValue)
                                        ) : typeof cellValue === 'object' && cellValue !== null ? (
                                          <div className="space-y-1">
                                            {Object.entries(cellValue).map(([k, v]) => (
                                              <div key={k} className="text-xs">
                                                <span className="font-semibold">
                                                  {formatInsightKey(k)}:
                                                </span>{' '}
                                                {typeof v === 'number'
                                                  ? formatCellNumber(v)
                                                  : typeof v === 'string'
                                                  ? formatDateString(v)
                                                  : String(v)}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          typeof cellValue === 'string'
                                            ? formatDateString(cellValue)
                                            : String(cellValue ?? '')
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Insights/Analysis */}
              {data.insights && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">
                    <span className="mr-2">💡</span>
                    Insights
                  </h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    {Array.isArray(data.insights) ? (
                      // Handle insights as array of strings
                      data.insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="mt-0.5 text-blue-600 font-bold">•</span>
                          <span>{insight}</span>
                        </div>
                      ))
                    ) : (
                      // Handle insights as object
                      Object.entries(data.insights).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="mt-0.5 text-blue-600 font-bold">
                            {getInsightIcon(key, value)}
                          </span>
                          <span>
                            <strong>{formatInsightKey(key)}:</strong> {formatInsightValue(value)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* AI-Recommended Actions */}
              {(data as any).aiActionSteps && Array.isArray((data as any).aiActionSteps) && (data as any).aiActionSteps.length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-purple-900">
                    <span className="mr-2">🤖</span>
                    AI-Recommended Actions
                  </h3>
                  <div className="space-y-3">
                    {(data as any).aiActionSteps.map((action: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-md bg-white p-3 text-sm shadow-sm"
                      >
                        <span className="font-semibold text-purple-700 min-w-[20px]">{index + 1}.</span>
                        <span className="text-gray-800">{action}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-purple-600 italic">
                    Generated by AI based on customer data and health patterns
                  </div>
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
            {formatNumber(item.value)}
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
                  {formatNumber(item.value)}
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
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded ${item.color ?? colors[idx % colors.length]}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {percentage}% ({formatNumber(item.value)})
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual representation */}
      <div className="flex h-48 w-48 items-center justify-center rounded-full border-8 border-gray-200 bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatNumber(total)}</div>
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
  a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
