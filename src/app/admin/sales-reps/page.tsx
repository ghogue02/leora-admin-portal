"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type SalesRep = {
  id: string;
  userId: string;
  territoryName: string;
  deliveryDay: string | null;
  weeklyRevenueQuota: number | null;
  monthlyRevenueQuota: number | null;
  annualRevenueQuota: number | null;
  sampleAllowancePerMonth: number;
  isActive: boolean;
  orderEntryEnabled: boolean;
  user: {
    fullName: string;
    email: string;
  };
  performance: {
    currentWeekRevenue: number;
    ytdRevenue: number;
    ordersThisWeek: number;
    customerCount: number;
    activeCustomerCount: number;
    quotaAchievementPercent: number;
  };
};

export default function SalesRepsPage() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [filteredReps, setFilteredReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReps, setSelectedReps] = useState<Set<string>>(new Set());

  // Get unique territories
  const territories = Array.from(new Set(reps.map(r => r.territoryName))).sort();

  const applyFilters = useCallback(() => {
    let filtered = [...reps];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        rep =>
          rep.user.fullName.toLowerCase().includes(term) ||
          rep.user.email.toLowerCase().includes(term)
      );
    }

    if (territoryFilter !== "all") {
      filtered = filtered.filter(rep => rep.territoryName === territoryFilter);
    }

    if (statusFilter !== "all") {
      const isActiveFilter = statusFilter === "active";
      filtered = filtered.filter(rep => rep.isActive === isActiveFilter);
    }

    setFilteredReps(filtered);
  }, [reps, searchTerm, territoryFilter, statusFilter]);

  useEffect(() => {
    fetchReps();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchReps = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/sales-reps");

      if (!response.ok) {
        throw new Error("Failed to fetch sales representatives");
      }

      const data = await response.json();
      setReps(data.salesReps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectRep = (repId: string) => {
    const newSelected = new Set(selectedReps);
    if (newSelected.has(repId)) {
      newSelected.delete(repId);
    } else {
      newSelected.add(repId);
    }
    setSelectedReps(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReps.size === filteredReps.length) {
      setSelectedReps(new Set());
    } else {
      setSelectedReps(new Set(filteredReps.map(r => r.id)));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedReps.size === 0) return;

    if (!confirm(`Deactivate ${selectedReps.size} selected sales rep(s)?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedReps).map(repId =>
        fetch(`/api/admin/sales-reps/${repId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        })
      );

      await Promise.all(promises);
      setSelectedReps(new Set());
      fetchReps();
    } catch (err) {
      console.error("Failed to deactivate sales reps", err);
      alert("Failed to deactivate sales reps");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return `${Math.round(value)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales representatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchReps}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Representatives</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage sales rep profiles, territories, quotas, and performance
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/sales-reps/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Create Sales Rep
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Territory Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Territory
              </label>
              <select
                value={territoryFilter}
                onChange={e => setTerritoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Territories</option>
                {territories.map(territory => (
                  <option key={territory} value={territory}>
                    {territory}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedReps.size > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedReps.size} selected
              </span>
              <button
                onClick={handleBulkDeactivate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Deactivate Selected
              </button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredReps.length} of {reps.length} sales representatives
        </div>

        {/* Sales Reps Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {filteredReps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No sales representatives found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedReps.size === filteredReps.length && filteredReps.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Territory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      YTD Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders This Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quota Achievement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Entry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReps.map(rep => (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedReps.has(rep.id)}
                          onChange={() => toggleSelectRep(rep.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
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
                          <div className="text-xs text-gray-500">{rep.deliveryDay}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rep.performance.customerCount} total
                        </div>
                        <div className="text-xs text-gray-500">
                          {rep.performance.activeCustomerCount} active
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(rep.performance.ytdRevenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rep.performance.ordersThisWeek}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPercentage(rep.performance.quotaAchievementPercent)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              rep.performance.quotaAchievementPercent >= 100
                                ? "bg-green-600"
                                : rep.performance.quotaAchievementPercent >= 75
                                ? "bg-yellow-600"
                                : "bg-red-600"
                            }`}
                            style={{
                              width: `${Math.min(rep.performance.quotaAchievementPercent, 100)}%`,
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            rep.orderEntryEnabled
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rep.orderEntryEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/sales-reps/${rep.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
