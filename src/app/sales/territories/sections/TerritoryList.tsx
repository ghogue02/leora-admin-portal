"use client";

import { useState, useMemo } from "react";
import { type Territory } from "../page";
import {
  PencilIcon,
  TrashIcon,
  UserIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

type SortField = "name" | "customerCount" | "revenue30Days" | "activeRate";
type SortDirection = "asc" | "desc";

interface TerritoryListProps {
  territories: Territory[];
  onEdit: (territory: Territory) => void;
  onDelete: (territoryId: string) => void;
  onRefresh: () => void;
}

export default function TerritoryList({
  territories,
  onEdit,
  onDelete,
  onRefresh,
}: TerritoryListProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTerritories = useMemo(() => {
    return [...territories].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "customerCount":
          comparison = a.customerCount - b.customerCount;
          break;
        case "revenue30Days":
          comparison = a.revenue30Days - b.revenue30Days;
          break;
        case "activeRate":
          const aRate = a.customerCount > 0 ? a.activeCustomerCount / a.customerCount : 0;
          const bRate = b.customerCount > 0 ? b.activeCustomerCount / b.customerCount : 0;
          comparison = aRate - bRate;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [territories, sortField, sortDirection]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getActiveRate = (territory: Territory) => {
    if (territory.customerCount === 0) return 0;
    return Math.round((territory.activeCustomerCount / territory.customerCount) * 100);
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
    >
      {label}
      {sortField === field && (
        <span className="text-blue-600">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );

  if (territories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <MapIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No territories yet</h3>
        <p className="text-gray-600 mb-6">
          Create your first territory to start organizing your sales regions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All Territories</h2>
            <p className="text-sm text-gray-600 mt-1">
              {territories.length} {territories.length === 1 ? "territory" : "territories"}
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <SortButton field="name" label="Territory Name" />
              </th>
              <th className="px-6 py-3 text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Rep
                </div>
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="customerCount" label="Customers" />
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="activeRate" label="Active %" />
              </th>
              <th className="px-6 py-3 text-left">
                <SortButton field="revenue30Days" label="30-Day Revenue" />
              </th>
              <th className="px-6 py-3 text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90-Day Revenue
                </div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  365-Day Revenue
                </div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </div>
              </th>
              <th className="px-6 py-3 text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTerritories.map((territory) => (
              <tr key={territory.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: territory.color }}
                    />
                    <div className="text-sm font-medium text-gray-900">
                      {territory.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {territory.salesRepName ? (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {territory.salesRepName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{territory.customerCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">
                      {getActiveRate(territory)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      ({territory.activeCustomerCount}/{territory.customerCount})
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(territory.revenue30Days)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(territory.revenue90Days)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(territory.revenue365Days)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {formatDate(territory.lastActivityDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(territory)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit territory"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(territory.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete territory"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MapIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}
