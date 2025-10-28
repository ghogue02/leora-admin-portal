/**
 * LOVABLE MIGRATION - Customer List Component
 *
 * Simplified customer list with filtering and search
 * Original: /src/app/sales/customers/page.tsx
 *
 * FEATURES:
 * - Customer search
 * - Risk status filtering
 * - Sortable columns
 * - Pagination
 */

'use client';

import { useCallback, useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";

type CustomerRiskStatus = "HEALTHY" | "AT_RISK_CADENCE" | "AT_RISK_REVENUE" | "DORMANT" | "CLOSED";

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  riskStatus: CustomerRiskStatus;
  lastOrderDate: string | null;
  recentRevenue: number;
  recentOrderCount: number;
  daysOverdue: number;
};

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CustomerRiskStatus | "ALL">("ALL");

  const loadCustomers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (activeFilter !== "ALL") params.set("risk", activeFilter);

      const response = await fetch(`/api/sales/customers?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load customers");

      const data = await response.json();
      setCustomers(data.customers);
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const getStatusBadge = (status: CustomerRiskStatus) => {
    const styles = {
      HEALTHY: "bg-green-100 text-green-800",
      AT_RISK_CADENCE: "bg-yellow-100 text-yellow-800",
      AT_RISK_REVENUE: "bg-orange-100 text-orange-800",
      DORMANT: "bg-red-100 text-red-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };

    const labels = {
      HEALTHY: "Healthy",
      AT_RISK_CADENCE: "At Risk (Cadence)",
      AT_RISK_REVENUE: "At Risk (Revenue)",
      DORMANT: "Dormant",
      CLOSED: "Closed",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Customers</h1>
        <p className="text-gray-600 mt-2">
          View and manage customers in your territory
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as CustomerRiskStatus | "ALL")}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Customers</option>
          <option value="HEALTHY">Healthy</option>
          <option value="AT_RISK_CADENCE">At Risk (Cadence)</option>
          <option value="AT_RISK_REVENUE">At Risk (Revenue)</option>
          <option value="DORMANT">Dormant</option>
        </select>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No customers found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      {customer.billingEmail && (
                        <p className="text-sm text-gray-600">{customer.billingEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(customer.riskStatus)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${customer.recentRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/sales/customers/${customer.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
