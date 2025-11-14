"use client";

import { useState, useEffect } from "react";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ResponsiveChartContainer } from "@/components/ui/responsive-chart-container";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";

type ProductHistoryReportsProps = {
  customerId: string;
};

type TimelineData = {
  months: string[];
  products: {
    id: string;
    name: string;
    data: number[];
  }[];
};

export default function ProductHistoryReports({ customerId }: ProductHistoryReportsProps) {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"3m" | "6m" | "12m">("12m");

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/sales/customers/${customerId}/product-history?type=timeline`
        );
        if (!response.ok) throw new Error("Failed to load product timeline");
        const data = await response.json();
        setTimeline(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    void loadTimeline();
  }, [customerId]);

  const exportPDF = () => {
    // In a real implementation, this would generate a PDF report
    // For now, we'll just alert
    alert("PDF export functionality will be implemented with a PDF generation library");
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="mt-4 h-96 animate-pulse rounded bg-gray-100"></div>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error || "No data available"}</p>
      </div>
    );
  }

  // Filter data by date range
  const monthsToShow = dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12;
  const filteredMonths = timeline.months.slice(-monthsToShow);
  const chartData = filteredMonths.map((month, index) => {
    const dataPoint: Record<string, string | number> = { month };
    timeline.products.forEach((product) => {
      dataPoint[product.name] = product.data[timeline.months.length - monthsToShow + index] || 0;
    });
    return dataPoint;
  });

  // Calculate trends
  const trends = timeline.products.map((product) => {
    const recentData = product.data.slice(-monthsToShow);
    const firstHalf = recentData.slice(0, Math.floor(monthsToShow / 2));
    const secondHalf = recentData.slice(Math.floor(monthsToShow / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const trend = secondAvg > firstAvg ? "up" : secondAvg < firstAvg ? "down" : "stable";
    const change = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      name: product.name,
      trend,
      change,
    };
  });

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Product History Reports</h2>
          <p className="mt-1 text-sm text-gray-600">
            Purchase timeline and seasonal patterns by product
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "3m" | "6m" | "12m")}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="12m">Last 12 Months</option>
          </select>
          <button
            type="button"
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveChartContainer minHeight={360}>
          {({ height, isCompact }) => (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                {!isCompact && <Legend />}
                {timeline.products.slice(0, 6).map((product, index) => (
                  <Line
                    key={product.id}
                    type="monotone"
                    dataKey={product.name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ResponsiveChartContainer>
      </div>

      {/* Trends */}
      <div className="border-t border-slate-200 p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Product Trends</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trends.slice(0, 6).map((trend) => (
            <div key={trend.name} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-gray-900">{trend.name}</p>
                {trend.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : trend.trend === "down" ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
              </div>
              <p className={`mt-2 text-xs ${
                trend.trend === "up" ? "text-green-600" :
                trend.trend === "down" ? "text-red-600" :
                "text-gray-600"
              }`}>
                {trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"}{" "}
                {formatPercentage(Math.abs(trend.change))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
