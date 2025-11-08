'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import ConversionChart from './sections/ConversionChart';
import TopPerformers from './sections/TopPerformers';
import RepLeaderboard from './sections/RepLeaderboard';
import CustomerSampleHistory from './sections/CustomerSampleHistory';
import SupplierReport from './sections/SupplierReport';
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 90),
    end: new Date(),
  });
  const [filters, setFilters] = useState({
    salesRepId: 'all',
    supplierId: 'all',
    skuId: 'all',
  });

  const repOptions = useMemo(() => {
    if (!analytics) return [];
    return analytics.repPerformance.map((rep) => ({ id: rep.id, name: rep.name }));
  }, [analytics]);

  const productOptions = useMemo(() => {
    if (!analytics) return [];
    return analytics.topProducts.map((product) => ({ id: product.id, name: product.productName }));
  }, [analytics]);

  const handleFilterChange = (field: 'salesRepId' | 'supplierId' | 'skuId', value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    void loadAnalytics();
  }, [dateRange, filters]);

  useEffect(() => {
    void loadSuppliers();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
      });
      if (filters.salesRepId !== 'all') params.set('salesRepId', filters.salesRepId);
      if (filters.supplierId !== 'all') params.set('supplierId', filters.supplierId);
      if (filters.skuId !== 'all') params.set('skuId', filters.skuId);

      const response = await fetch(`/api/sales/analytics/samples?${params}`);
      if (response.ok) {
        const result = await response.json();
        setAnalytics(result);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    const params = new URLSearchParams({
      startDate: format(dateRange.start, 'yyyy-MM-dd'),
      endDate: format(dateRange.end, 'yyyy-MM-dd'),
    });
    try {
      const response = await fetch(`/api/sales/analytics/samples/suppliers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSupplierOptions(
          (data.suppliers ?? []).map((supplier: { supplierId: string; supplierName: string }) => ({
            id: supplier.supplierId,
            name: supplier.supplierName,
          })),
        );
      }
    } catch (error) {
      console.error('Failed to load supplier options', error);
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
      if (filters.salesRepId !== 'all') params.set('salesRepId', filters.salesRepId);
      if (filters.supplierId !== 'all') params.set('supplierId', filters.supplierId);
      if (filters.skuId !== 'all') params.set('skuId', filters.skuId);

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

  if (!analytics) {
    return null;
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterPanel
          filters={filters}
          repOptions={repOptions}
          supplierOptions={supplierOptions}
          productOptions={productOptions}
          onFilterChange={handleFilterChange}
        />
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
        <AnalyticsStatCard
          icon={<Package className="h-5 w-5" />}
          label="Total Samples"
          value={analytics.overview.totalSamples.toLocaleString()}
          color="blue"
        />
        <AnalyticsStatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Conversion Rate"
          value={`${(analytics.overview.conversionRate * 100).toFixed(1)}%`}
          color="green"
        />
        <AnalyticsStatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Revenue Generated"
          value={`$${analytics.overview.totalRevenue.toLocaleString()}`}
          color="purple"
        />
        <AnalyticsStatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Active Products"
          value={analytics.overview.activeProducts.toLocaleString()}
          color="orange"
        />
      </div>

      {/* Conversion Chart */}
      <ConversionChart trends={analytics.trends} />

      {/* Top Performers & Rep Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopPerformers products={analytics.topProducts} />
        <RepLeaderboard reps={analytics.repPerformance} />
      </div>

      {/* Customer Sample History */}
      <CustomerSampleHistory />

      {/* Supplier Report */}
      <SupplierReport startDate={dateRange.start} endDate={dateRange.end} />
    </main>
  );
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
};

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
};

function AnalyticsStatCard({ icon, label, value, color }: StatCardProps) {
  const palette = colorMap[color];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg ${palette.bg} p-2`}>{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${palette.text}`}>{value}</p>
      </div>
    </div>
  );
}

type FilterPanelProps = {
  filters: {
    salesRepId: string;
    supplierId: string;
    skuId: string;
  };
  repOptions: Array<{ id: string; name: string }>;
  supplierOptions: Array<{ id: string; name: string }>;
  productOptions: Array<{ id: string; name: string }>;
  onFilterChange: (field: 'salesRepId' | 'supplierId' | 'skuId', value: string) => void;
};

function FilterPanel({ filters, repOptions, supplierOptions, productOptions, onFilterChange }: FilterPanelProps) {
  return (
    <div className="grid w-full gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Sales Rep
        <select
          value={filters.salesRepId}
          onChange={(event) => onFilterChange('salesRepId', event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All reps</option>
          {repOptions.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Supplier
        <select
          value={filters.supplierId}
          onChange={(event) => onFilterChange('supplierId', event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All suppliers</option>
          {supplierOptions.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Product
        <select
          value={filters.skuId}
          onChange={(event) => onFilterChange('skuId', event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All products</option>
          {productOptions.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
