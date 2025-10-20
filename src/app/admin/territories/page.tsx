"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Territory = {
  territoryName: string;
  repCount: number;
  customerCount: number;
  totalRevenue: number;
  primaryRep?: {
    id: string;
    name: string;
    email: string;
  };
};

type TerritoryDetail = {
  territoryName: string;
  salesReps: Array<{
    id: string;
    name: string;
    email: string;
    customerCount: number;
    isActive: boolean;
  }>;
  customers: Array<{
    id: string;
    name: string;
    lastOrderDate: string | null;
  }>;
  revenueByQuarter: Array<{
    quarter: string;
    revenue: number;
  }>;
};

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [territoryDetail, setTerritoryDetail] = useState<TerritoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/territories");

      if (!response.ok) {
        throw new Error("Failed to fetch territories");
      }

      const data = await response.json();
      setTerritories(data.territories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTerritoryDetail = async (territoryName: string) => {
    try {
      setIsLoadingDetail(true);
      const response = await fetch(
        `/api/admin/territories/${encodeURIComponent(territoryName)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch territory details");
      }

      const data = await response.json();
      setTerritoryDetail(data.territory);
      setSelectedTerritory(territoryName);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load territory details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading territories...</p>
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
            onClick={fetchTerritories}
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
              <h1 className="text-3xl font-bold text-gray-900">Territory Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage sales territories and assignments
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Territories Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Territories</h2>
            <p className="text-sm text-gray-600 mt-1">
              {territories.length} {territories.length === 1 ? "territory" : "territories"}
            </p>
          </div>

          {territories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No territories found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Territory Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Primary Rep
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Reps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {territories.map(territory => (
                    <tr key={territory.territoryName} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {territory.territoryName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {territory.primaryRep ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {territory.primaryRep.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {territory.primaryRep.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No primary rep</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{territory.repCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{territory.customerCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(territory.totalRevenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => fetchTerritoryDetail(territory.territoryName)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Territory Detail Modal/Panel */}
        {selectedTerritory && territoryDetail && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedTerritory} - Territory Details
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedTerritory(null);
                  setTerritoryDetail(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sales Reps in Territory */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Sales Representatives ({territoryDetail.salesReps.length})
                    </h3>
                    {territoryDetail.salesReps.length === 0 ? (
                      <p className="text-sm text-gray-500">No sales reps assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {territoryDetail.salesReps.map(rep => (
                          <div
                            key={rep.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{rep.name}</p>
                              <p className="text-xs text-gray-500">{rep.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900">
                                {rep.customerCount} customers
                              </p>
                              <span
                                className={`text-xs ${
                                  rep.isActive ? "text-green-600" : "text-gray-400"
                                }`}
                              >
                                {rep.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Revenue by Quarter */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-3">
                      Revenue by Quarter
                    </h3>
                    {territoryDetail.revenueByQuarter.length === 0 ? (
                      <p className="text-sm text-gray-500">No revenue data available</p>
                    ) : (
                      <div className="space-y-2">
                        {territoryDetail.revenueByQuarter.map(quarter => (
                          <div
                            key={quarter.quarter}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {quarter.quarter}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(quarter.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Customers in Territory */}
                <div className="mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">
                    Customers in Territory ({territoryDetail.customers.length})
                  </h3>
                  {territoryDetail.customers.length === 0 ? (
                    <p className="text-sm text-gray-500">No customers in this territory</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Customer Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Last Order Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {territoryDetail.customers.slice(0, 10).map(customer => (
                            <tr key={customer.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {customer.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {customer.lastOrderDate
                                  ? new Date(customer.lastOrderDate).toLocaleDateString()
                                  : "Never"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {territoryDetail.customers.length > 10 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Showing 10 of {territoryDetail.customers.length} customers
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
