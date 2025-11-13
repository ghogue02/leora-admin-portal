"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";

interface JobFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  status: string;
  type: string;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const JOB_TYPES = [
  { value: "", label: "All Types" },
  { value: "image_extraction", label: "Image Extraction" },
  { value: "customer_enrichment", label: "Customer Enrichment" },
  { value: "report_generation", label: "Report Generation" },
  { value: "bulk_import", label: "Bulk Import" },
];

const JOB_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function JobFilters({ onFilterChange }: JobFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    type: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: "all",
      type: "",
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.status !== "all" || filters.type !== "" || filters.search.trim() !== "";

  return (
    <ResponsiveCard>
      <ResponsiveCardHeader>
        <ResponsiveCardTitle>Filter jobs</ResponsiveCardTitle>
        <ResponsiveCardDescription>Dial in by status, type, or text search.</ResponsiveCardDescription>
      </ResponsiveCardHeader>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {JOB_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Job type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {JOB_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Job ID, type, or error..."
            className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Sort by</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="touch-target w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Created Date</option>
            <option value="completedAt">Completed Date</option>
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="attempts">Attempts</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Order</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange("sortOrder", "desc")}
              className={`touch-target flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                filters.sortOrder === "desc"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-gray-700 hover:bg-slate-50"
              }`}
            >
              Desc
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("sortOrder", "asc")}
              className={`touch-target flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                filters.sortOrder === "asc"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-gray-700 hover:bg-slate-50"
              }`}
            >
              Asc
            </button>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleClearFilters}
            className="touch-target rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50"
          >
            Clear filters
          </button>
        </div>
      )}
    </ResponsiveCard>
  );
}
