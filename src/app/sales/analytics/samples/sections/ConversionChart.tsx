'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

type Trend = {
  date: string;
  samples: number;
  conversions: number;
  revenue: number;
};

type ConversionChartProps = {
  trends: Trend[];
};

type ViewMode = 'weekly' | 'monthly' | 'quarterly';

export default function ConversionChart({ trends }: ConversionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [metric, setMetric] = useState<'conversions' | 'revenue'>('conversions');

  // Process data based on view mode
  const processedData = trends.map((trend) => ({
    date: format(parseISO(trend.date), 'MMM dd'),
    samples: trend.samples,
    conversions: trend.conversions,
    conversionRate: trend.samples > 0 ? (trend.conversions / trend.samples) * 100 : 0,
    revenue: trend.revenue,
  }));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Conversion Trends</h2>
          <p className="text-xs text-gray-500">Sample performance over time</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('quarterly')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === 'quarterly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quarterly
            </button>
          </div>

          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setMetric('conversions')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                metric === 'conversions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Conversions
            </button>
            <button
              onClick={() => setMetric('revenue')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                metric === 'revenue'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              iconType="circle"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="samples"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Samples Given"
              dot={{ fill: '#3b82f6', r: 3 }}
            />
            {metric === 'conversions' ? (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Conversions"
                  dot={{ fill: '#10b981', r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Conversion Rate %"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                />
              </>
            ) : (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Revenue ($)"
                dot={{ fill: '#f59e0b', r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
