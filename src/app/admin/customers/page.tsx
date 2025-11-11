'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatUTCDate } from '@/lib/dates';

interface Customer {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  territory: string | null;
  salesRep: {
    id: string;
    name: string;
    email: string;
  } | null;
  lastOrderDate: string | null;
  totalOrders: number;
  riskStatus: string;
  city: string | null;
  state: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const RISK_STATUS_COLORS = {
  HEALTHY: 'bg-green-100 text-green-800',
  AT_RISK_CADENCE: 'bg-yellow-100 text-yellow-800',
  AT_RISK_REVENUE: 'bg-orange-100 text-orange-800',
  DORMANT: 'bg-red-100 text-red-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    territory: '',
    riskStatus: [] as string[],
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Bulk selection
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const { search, territory, riskStatus, dateFrom, dateTo } = filters;
  const {
    search: appliedSearch,
    territory: appliedTerritory,
    riskStatus: appliedRiskStatus,
    dateFrom: appliedDateFrom,
    dateTo: appliedDateTo,
  } = appliedFilters;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      sortBy,
      sortOrder,
    });

    if (appliedSearch) params.append('search', appliedSearch);
    if (appliedTerritory) params.append('territory', appliedTerritory);
    if (appliedRiskStatus.length > 0) params.append('riskStatus', appliedRiskStatus.join(','));
    if (appliedDateFrom) params.append('dateFrom', appliedDateFrom);
    if (appliedDateTo) params.append('dateTo', appliedDateTo);

    try {
      const response = await fetch(`/api/admin/customers?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    sortOrder,
    appliedSearch,
    appliedTerritory,
    appliedRiskStatus,
    appliedDateFrom,
    appliedDateTo,
  ]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleBulkReassign = async () => {
    // TODO: Implement bulk reassign modal
    alert('Bulk reassign feature - implement modal');
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/customers/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds: selectedCustomers.length > 0 ? selectedCustomers : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${formatUTCDate(new Date())}.csv`;
      a.click();
    } catch (err: unknown) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <Link
          href="/admin/customers/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Territory"
            value={territory}
            onChange={(e) => setFilters((prev) => ({ ...prev, territory: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            className="border rounded px-3 py-2"
          />
        </div>

        {/* Risk Status Checkboxes */}
        <div className="mb-4">
          <label className="font-semibold mr-4">Risk Status:</label>
          {['HEALTHY', 'AT_RISK_CADENCE', 'AT_RISK_REVENUE', 'DORMANT', 'CLOSED'].map(status => (
            <label key={status} className="mr-4 inline-flex items-center">
              <input
                type="checkbox"
                checked={riskStatus.includes(status)}
                onChange={(e) => {
                  const nextStatuses = e.target.checked
                    ? [...riskStatus, status]
                    : riskStatus.filter(s => s !== status);
                  setFilters((prev) => ({ ...prev, riskStatus: nextStatuses }));
                }}
                className="mr-1"
              />
              {status}
            </label>
          ))}
        </div>

        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Apply Filters
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <span className="font-semibold">{selectedCustomers.length} selected</span>
          <button
            onClick={handleBulkReassign}
            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Bulk Reassign
          </button>
          <button
            onClick={handleExport}
            className="ml-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export Selected
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading customers...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-12">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Customer Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('accountNumber')}
                >
                  Account # {sortBy === 'accountNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Territory</th>
                <th className="px-4 py-3 text-left">Sales Rep</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastOrderDate')}
                >
                  Last Order {sortBy === 'lastOrderDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Total Orders</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('riskStatus')}
                >
                  Risk Status {sortBy === 'riskStatus' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => toggleSelectCustomer(customer.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {customer.name}
                    </Link>
                    <div className="text-sm text-gray-500">
                      {customer.city}, {customer.state}
                    </div>
                  </td>
                  <td className="px-4 py-3">{customer.accountNumber || '-'}</td>
                  <td className="px-4 py-3">{customer.territory || '-'}</td>
                  <td className="px-4 py-3">
                    {customer.salesRep ? (
                      <div>
                        <div>{customer.salesRep.name}</div>
                        <div className="text-sm text-gray-500">{customer.salesRep.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">{customer.totalOrders}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        RISK_STATUS_COLORS[customer.riskStatus as keyof typeof RISK_STATUS_COLORS] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {customer.riskStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/customers/${customer.id}?tab=details`}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} customers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
