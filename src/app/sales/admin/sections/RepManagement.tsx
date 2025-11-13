"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";

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
    void fetchReps();
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

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  if (isLoading) {
    return (
      <ResponsiveCard className="animate-pulse space-y-3">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="h-6 w-32 rounded bg-slate-200" />
        <div className="h-32 rounded bg-slate-100" />
      </ResponsiveCard>
    );
  }

  if (error) {
    return (
      <ResponsiveCard>
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Sales representatives</ResponsiveCardTitle>
          <ResponsiveCardDescription>Unable to load data.</ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <p className="text-sm text-red-600">{error}</p>
      </ResponsiveCard>
    );
  }

  return (
    <section className="layout-stack">
      <ResponsiveCard>
        <ResponsiveCardHeader className="gap-2 sm:flex sm:items-center sm:justify-between">
          <div>
            <ResponsiveCardTitle>Sales representatives</ResponsiveCardTitle>
            <ResponsiveCardDescription>
              {reps.length} {reps.length === 1 ? "rep" : "reps"} synced across desktop + mobile.
            </ResponsiveCardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="touch-target"
            onClick={fetchReps}
          >
            Refresh
          </Button>
        </ResponsiveCardHeader>
        <p className="text-sm text-gray-600">
          Track coverage, quota progress, and sample spend to spot gaps before they impact service.
        </p>
      </ResponsiveCard>

      {reps.length === 0 ? (
        <ResponsiveCard variant="muted">
          <p className="text-sm text-gray-600">No sales representatives found.</p>
        </ResponsiveCard>
      ) : (
        <ResponsiveTable stickyHeader>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                {[
                  "Representative",
                  "Territory",
                  "Customers",
                  "Week Revenue",
                  "Month Revenue",
                  "Samples",
                  "Status",
                ].map((heading) => (
                  <th key={heading} className="px-6 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {reps.map((rep) => (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{rep.user.fullName}</div>
                    <div className="text-xs text-gray-500">{rep.user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rep.territoryName}
                    {rep.deliveryDay ? (
                      <span className="block text-xs text-gray-500">{rep.deliveryDay}</span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{rep.performance.customerCount}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(rep.performance.currentWeekRevenue)}
                    </div>
                    {rep.weeklyRevenueQuota && (
                      <div className="text-xs text-gray-500">
                        {formatPercentage(rep.performance.weeklyQuotaProgress)} of quota
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(rep.performance.currentMonthRevenue)}
                    </div>
                    {rep.monthlyRevenueQuota && (
                      <div className="text-xs text-gray-500">
                        {formatPercentage(rep.performance.monthlyQuotaProgress)} of quota
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-semibold">
                      {rep.performance.samplesUsedThisMonth} / {rep.sampleAllowancePerMonth}
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-1.5 rounded-full ${
                          rep.performance.samplesUsedThisMonth > rep.sampleAllowancePerMonth
                            ? "bg-red-500"
                            : "bg-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            (rep.performance.samplesUsedThisMonth / rep.sampleAllowancePerMonth) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        rep.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {rep.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </section>
  );
}
