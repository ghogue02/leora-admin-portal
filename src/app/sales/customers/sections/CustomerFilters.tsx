'use client';

import type { CustomerRiskStatus } from "@prisma/client";

type FilterOption = {
  label: string;
  value: CustomerRiskStatus | "ALL" | "DUE";
  count?: number;
  color: string;
};

type CustomerFiltersProps = {
  activeFilter: CustomerRiskStatus | "ALL" | "DUE";
  onFilterChange: (filter: CustomerRiskStatus | "ALL" | "DUE") => void;
  riskCounts: Record<string, number>;
  customersDueCount: number;
};

export default function CustomerFilters({
  activeFilter,
  onFilterChange,
  riskCounts,
  customersDueCount,
}: CustomerFiltersProps) {
  const filters: FilterOption[] = [
    {
      label: "Due to Order",
      value: "DUE",
      count: customersDueCount,
      color: "text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100",
    },
    {
      label: "Healthy",
      value: "HEALTHY",
      count: riskCounts.HEALTHY,
      color: "text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100",
    },
    {
      label: "At Risk (Cadence)",
      value: "AT_RISK_CADENCE",
      count: riskCounts.AT_RISK_CADENCE,
      color: "text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100",
    },
    {
      label: "At Risk (Revenue)",
      value: "AT_RISK_REVENUE",
      count: riskCounts.AT_RISK_REVENUE,
      color: "text-orange-700 bg-orange-50 border-orange-300 hover:bg-orange-100",
    },
    {
      label: "Dormant",
      value: "DORMANT",
      count: riskCounts.DORMANT,
      color: "text-rose-700 bg-rose-50 border-rose-300 hover:bg-rose-100",
    },
    {
      label: "All Customers",
      value: "ALL",
      count: Object.values(riskCounts).reduce((sum, count) => sum + count, 0),
      color: "text-gray-700 bg-white border-gray-300 hover:bg-gray-50",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        const baseClasses = "rounded-lg border px-4 py-2 text-sm font-medium transition";
        const activeClasses = isActive
          ? "ring-2 ring-offset-2 ring-blue-500 shadow-sm"
          : "";

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={`${baseClasses} ${filter.color} ${activeClasses}`}
          >
            <span className="flex items-center gap-2">
              {filter.label}
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  isActive ? "bg-white/80" : "bg-white/60"
                }`}
              >
                {filter.count ?? 0}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
