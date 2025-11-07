'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import ConversionChart from './sections/ConversionChart';
import TopPerformers from './sections/TopPerformers';
import RepLeaderboard from './sections/RepLeaderboard';
import CustomerSampleHistory from './sections/CustomerSampleHistory';
import SupplierReport from './sections/SupplierReport';
import SampleStatsCard from '../../samples/components/SampleStatsCard';
import { Calendar, TrendingUp, DollarSign, Package } from 'lucide-react';

type AnalyticsData = {
  overview: {
    totalSamples: number;
    conversionRate: number;
    totalRevenue: number;
    activeProducts: number;
  };
  trends: Array<{
    date: string;
    samples: number;
    conversions: number;
    revenue: number;
  }>;
  topProducts: Array<{
    id: string;
    productName: string;
    skuCode: string;
    brand: string;
    samplesGiven: number;
    orders: number;
    conversionRate: number;
    revenue: number;
  }>;
  repPerformance: Array<{
    id: string;
    name: string;
    samplesGiven: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>;
};

export default function SampleAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 90),
    end: new Date(),
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/sales/analytics/samples?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (days: number) => {
    setDateRange({
      start: subDays(new Date(), days),
      end: new Date(),
    });
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        format,
      });

      const response = await fetch(`/api/sales/analytics/samples/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sample-analytics-${format === 'csv' ? 'report.csv' : 'report.pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <div className="rounded-lg border border-red-100 bg-red-50 p-6">
          <p className="text-sm text-red-700">Failed to load analytics data. Please try again.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDateRangeChange(30)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              dateRange.start >= subDays(new Date(), 30)
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => handleDateRangeChange(90)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              dateRange.start < subDays(new Date(), 30) && dateRange.start >= subDays(new Date(), 90)
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => handleDateRangeChange(180)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              dateRange.start < subDays(new Date(), 90)
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            180 Days
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <button
            onClick={() => handleExport('csv')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400"
          >
            Export PDF
          </button>
        </div>
      </header>

      {/* Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SampleStatsCard
          icon={<Package className="h-5 w-5" />}
          label="Total Samples"
          value={data.overview.totalSamples.toLocaleString()}
          trend={null}
          color="blue"
        />
        <SampleStatsCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Conversion Rate"
          value={`${(data.overview.conversionRate * 100).toFixed(1)}%`}
          trend={null}
          color="green"
        />
        <SampleStatsCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Revenue Generated"
          value={`$${data.overview.totalRevenue.toLocaleString()}`}
          trend={null}
          color="purple"
        />
        <SampleStatsCard
          icon={<Calendar className="h-5 w-5" />}
          label="Active Products"
          value={data.overview.activeProducts.toLocaleString()}
          trend={null}
          color="orange"
        />
      </div>

      {/* Conversion Chart */}
      <ConversionChart trends={data.trends} />

      {/* Top Performers & Rep Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopPerformers products={data.topProducts} />
        <RepLeaderboard reps={data.repPerformance} />
      </div>

      {/* Customer Sample History */}
      <CustomerSampleHistory />

      {/* Supplier Report */}
      <SupplierReport />
    </main>
  );
}
