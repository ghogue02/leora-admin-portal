"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";
import { ResponsiveChartContainer } from "@/components/ui/responsive-chart-container";

type ForecastData = {
  reps: {
    id: string;
    name: string;
    projectedAnnual: number;
    confidenceLevel: "high" | "medium" | "low";
    trend: "up" | "down" | "stable";
    currentPace: number;
    ytdActual: number;
    ytdTarget: number;
  }[];
  teamForecast: {
    projectedAnnual: number;
    currentPace: number;
    ytdActual: number;
  };
  monthlyProjection: {
    month: string;
    projected: number;
    lower: number;
    upper: number;
  }[];
};

export default function RevenueForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/manager/forecast");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error loading forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (level: "high" | "medium" | "low") => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-red-100 text-red-800";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      case "stable":
        return "→";
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "stable":
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12">
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">Unable to load forecast data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Forecast Overview */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Forecast & Projections</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-sm text-gray-600">Projected Annual Revenue</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {formatCurrency(data.teamForecast.projectedAnnual)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Based on current pace</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">YTD Actual</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {formatCurrency(data.teamForecast.ytdActual)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Year to date performance</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-600">Current Weekly Pace</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {formatCurrency(data.teamForecast.currentPace)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Average per week</p>
          </div>
        </div>
      </div>

      {/* Monthly Projection Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="font-semibold mb-4">12-Month Revenue Projection</h3>
        <ResponsiveChartContainer minHeight={320}>
          {({ height, isCompact }) => (
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={data.monthlyProjection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value))}
                  labelStyle={{ color: "#000" }}
                />
                {!isCompact && <Legend />}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  fillOpacity={0.3}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stackId="2"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Projected"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="3"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  fillOpacity={0.3}
                  name="Lower Bound"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ResponsiveChartContainer>
      </div>

      {/* Individual Rep Forecasts */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b p-6">
          <h3 className="font-semibold">Individual Rep Projections</h3>
          <p className="text-sm text-gray-600">Annual revenue forecast by sales representative</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Rep
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Projected Annual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  YTD Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  YTD vs Target
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                  Trend
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.reps.map((rep) => {
                const ytdVsTarget =
                  rep.ytdTarget > 0 ? (rep.ytdActual / rep.ytdTarget) * 100 : 0;

                return (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{rep.name}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-blue-600">
                        {formatCurrency(rep.projectedAnnual)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(rep.currentPace)}/wk
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {formatCurrency(rep.ytdActual)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-medium ${
                          ytdVsTarget >= 100
                            ? "text-green-600"
                            : ytdVsTarget >= 80
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatPercentage(ytdVsTarget)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xl ${getTrendColor(rep.trend)}`}>
                        {getTrendIcon(rep.trend)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={getConfidenceBadge(rep.confidenceLevel)}>
                        {rep.confidenceLevel.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Export Forecast Report</h3>
            <p className="text-sm text-gray-600">Download detailed projection analysis</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
