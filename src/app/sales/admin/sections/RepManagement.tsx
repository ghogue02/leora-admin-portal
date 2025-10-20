"use client";

import { useState, useEffect } from "react";

type SalesRep = {
  id: string;
  userId: string;
  territoryName: string;
  deliveryDay: string | null;
  weeklyRevenueQuota: number | null;
  monthlyRevenueQuota: number | null;
  sampleAllowancePerMonth: number;
  isActive: boolean;
  user: {
    fullName: string;
    email: string;
  };
  performance: {
    currentWeekRevenue: number;
    currentMonthRevenue: number;
    customerCount: number;
    samplesUsedThisMonth: number;
    weeklyQuotaProgress: number;
    monthlyQuotaProgress: number;
  };
};

export default function RepManagement() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/admin/reps");

      if (!response.ok) {
        throw new Error("Failed to fetch sales representatives");
      }

      const data = await response.json();
      setReps(data.reps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sales Representatives</h2>
          <p className="mt-1 text-sm text-gray-600">
            {reps.length} {reps.length === 1 ? "representative" : "representatives"}
          </p>
        </div>
        <button
          onClick={fetchReps}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {reps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No sales representatives found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Representative
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Samples
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reps.map((rep) => (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {rep.user.fullName}
                      </div>
                      <div className="text-sm text-gray-500">{rep.user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{rep.territoryName}</div>
                    {rep.deliveryDay && (
                      <div className="text-sm text-gray-500">{rep.deliveryDay}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {rep.performance.customerCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(rep.performance.currentWeekRevenue)}
                    </div>
                    {rep.weeklyRevenueQuota && (
                      <div className="text-xs text-gray-500">
                        {formatPercentage(rep.performance.weeklyQuotaProgress)} of quota
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(rep.performance.currentMonthRevenue)}
                    </div>
                    {rep.monthlyRevenueQuota && (
                      <div className="text-xs text-gray-500">
                        {formatPercentage(rep.performance.monthlyQuotaProgress)} of quota
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {rep.performance.samplesUsedThisMonth} / {rep.sampleAllowancePerMonth}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          rep.performance.samplesUsedThisMonth > rep.sampleAllowancePerMonth
                            ? "bg-red-600"
                            : "bg-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            (rep.performance.samplesUsedThisMonth / rep.sampleAllowancePerMonth) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rep.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {rep.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
