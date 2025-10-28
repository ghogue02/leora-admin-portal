"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";

type Rep = {
  id: string;
  name: string;
  thisMonthRevenue: number;
  ytdRevenue: number;
  allTimeRevenue: number;
};

type Props = {
  reps: Rep[];
};

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function PerformanceComparison({ reps }: Props) {
  const [viewMode, setViewMode] = useState<"week" | "ytd" | "alltime">("week");

  const getRevenueKey = () => {
    switch (viewMode) {
      case "week":
        return "thisMonthRevenue";
      case "ytd":
        return "ytdRevenue";
      case "alltime":
        return "allTimeRevenue";
    }
  };

  const getViewLabel = () => {
    switch (viewMode) {
      case "week":
        return "This Month";
      case "ytd":
        return "Year to Date";
      case "alltime":
        return "All-Time";
    }
  };

  // Sort reps by current view revenue (descending)
  const revenueKey = getRevenueKey();
  const sortedReps = [...reps].sort((a, b) => b[revenueKey] - a[revenueKey]);

  // Calculate total for percentage
  const totalRevenue = sortedReps.reduce((sum, rep) => sum + rep[revenueKey], 0);

  // Prepare data for bar chart
  const barChartData = sortedReps.map((rep) => ({
    name: rep.name.split(" ")[0], // First name only for space
    revenue: rep[revenueKey],
  }));

  // Prepare data for pie chart
  const pieChartData = sortedReps.map((rep, idx) => ({
    name: rep.name,
    value: rep[revenueKey],
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  // Prepare weekly trend data (mock - in production would come from API)
  const weeklyTrendData = [
    {
      week: "Week 1",
      ...Object.fromEntries(reps.map((rep) => [rep.name, Math.random() * 10000])),
    },
    {
      week: "Week 2",
      ...Object.fromEntries(reps.map((rep) => [rep.name, Math.random() * 12000])),
    },
    {
      week: "Week 3",
      ...Object.fromEntries(reps.map((rep) => [rep.name, Math.random() * 11000])),
    },
    {
      week: "Week 4",
      ...Object.fromEntries(reps.map((rep) => [rep.name, rep[revenueKey]])),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Performance Comparison</h3>
            <p className="text-sm text-gray-600">Compare team performance across periods</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setViewMode("ytd")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "ytd"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => setViewMode("alltime")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "alltime"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All-Time
            </button>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="font-semibold mb-4">Rankings - {getViewLabel()}</h3>
        <div className="space-y-3">
          {sortedReps.map((rep, idx) => {
            const percentage = totalRevenue > 0 ? (rep[revenueKey] / totalRevenue) * 100 : 0;
            const rankColor =
              idx === 0 ? "text-yellow-600" : idx === 1 ? "text-gray-400" : "text-orange-600";
            const rankBg =
              idx === 0
                ? "bg-yellow-100"
                : idx === 1
                ? "bg-gray-100"
                : idx === 2
                ? "bg-orange-100"
                : "bg-white";

            return (
              <div
                key={rep.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${rankBg}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${rankColor}`}>#{idx + 1}</div>
                  <div>
                    <p className="font-semibold">{rep.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatPercentage(percentage)} of team total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(rep[revenueKey])}</p>
                  {idx < 3 && (
                    <Badge
                      className={
                        idx === 0
                          ? "bg-yellow-600"
                          : idx === 1
                          ? "bg-gray-600"
                          : "bg-orange-600"
                      }
                    >
                      {idx === 0 ? "🥇 Top" : idx === 1 ? "🥈 2nd" : "🥉 3rd"}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Chart Comparison */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="font-semibold mb-4">Revenue Comparison - {getViewLabel()}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatCurrency(Number(value))}
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart - Market Share */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold mb-4">Team Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name.split(" ")[0]}: ${formatPercentage(percent * 100)}`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - Trends */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold mb-4">4-Week Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Legend />
              {reps.slice(0, 5).map((rep, idx) => (
                <Line
                  key={rep.id}
                  type="monotone"
                  dataKey={rep.name}
                  stroke={CHART_COLORS[idx]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
