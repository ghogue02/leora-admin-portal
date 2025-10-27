"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import Link from "next/link";

type TerritoryDrilldownData = {
  territory: {
    name: string;
    repName: string;
  };
  accounts: {
    id: string;
    name: string;
    riskStatus: string;
    revenue: number;
    orderCount: number;
    lastOrderDate: string | null;
  }[];
  healthBreakdown: {
    healthy: number;
    atRisk: number;
    dormant: number;
  };
  revenueDistribution: {
    name: string;
    value: number;
  }[];
  stats: {
    totalRevenue: number;
    totalAccounts: number;
    avgRevenuePerAccount: number;
  };
};

type Props = {
  territoryName: string | null;
  open: boolean;
  onClose: () => void;
};

const COLORS = {
  healthy: "#10b981",
  atRisk: "#f59e0b",
  dormant: "#ef4444",
};

export default function TerritoryDrilldownModal({ territoryName, open, onClose }: Props) {
  const [data, setData] = useState<TerritoryDrilldownData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (territoryName && open) {
      loadTerritoryData();
    }
  }, [territoryName, open]);

  const loadTerritoryData = async () => {
    if (!territoryName) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/sales/manager/territory/${encodeURIComponent(territoryName)}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error loading territory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800";
      case "AT_RISK_CADENCE":
      case "AT_RISK_REVENUE":
        return "bg-yellow-100 text-yellow-800";
      case "DORMANT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const healthChartData = data
    ? [
        { name: "Healthy", value: data.healthBreakdown.healthy, color: COLORS.healthy },
        { name: "At Risk", value: data.healthBreakdown.atRisk, color: COLORS.atRisk },
        { name: "Dormant", value: data.healthBreakdown.dormant, color: COLORS.dormant },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? `Territory: ${data.territory.name}` : "Loading..."}
          </DialogTitle>
          {data && (
            <p className="text-sm text-gray-600">Managed by {data.territory.repName}</p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold">
                  ${data.stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="mt-1 text-2xl font-bold">{data.stats.totalAccounts}</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-600">Avg per Account</p>
                <p className="mt-1 text-2xl font-bold">
                  ${data.stats.avgRevenuePerAccount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Health Breakdown Chart */}
            <div className="rounded-lg border bg-white p-6">
              <h3 className="font-semibold mb-4">Customer Health Distribution</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={healthChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {healthChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Healthy:</span>
                    <span className="font-semibold text-green-600">
                      {data.healthBreakdown.healthy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">At Risk:</span>
                    <span className="font-semibold text-yellow-600">
                      {data.healthBreakdown.atRisk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dormant:</span>
                    <span className="font-semibold text-red-600">
                      {data.healthBreakdown.dormant}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* All Accounts Table */}
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="border-b p-4">
                <h3 className="font-semibold">All Accounts ({data.accounts.length})</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Account
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Health
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                        Revenue
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                        Orders
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Last Order
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/sales/customers/${account.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {account.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2">
                          <Badge className={getRiskBadgeColor(account.riskStatus)}>
                            {account.riskStatus.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          ${account.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">{account.orderCount}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {account.lastOrderDate
                            ? new Date(account.lastOrderDate).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
