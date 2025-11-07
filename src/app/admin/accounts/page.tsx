'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: { id: string; name: string; code: string }[];
  primaryRole: string;
  territory: string | null;
  linkedSalesRepId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PortalUser {
  id: string;
  email: string;
  fullName: string;
  roles: { id: string; name: string; code: string }[];
  primaryRole: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  customer: {
    id: string;
    name: string;
    accountNumber: string | null;
  } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INVITED: 'bg-blue-100 text-blue-800',
  DISABLED: 'bg-red-100 text-red-800',
};

const createFilterState = () => ({
  search: '',
  role: '',
  status: '',
  territory: '',
});

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<'internal' | 'portal'>('internal');

  // Internal Users State
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  // Portal Users State
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [portalUsersPagination, setPortalUsersPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState(createFilterState);
  const [appliedFilters, setAppliedFilters] = useState(createFilterState);

  const { search, role, status, territory } = filters;
  const {
    search: appliedSearch,
    role: appliedRole,
    status: appliedStatus,
    territory: appliedTerritory,
  } = appliedFilters;

  const sortBy = 'fullName';
  const sortOrder: 'asc' | 'desc' = 'asc';

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'internal') {
      fetchUsers();
    } else {
      fetchPortalUsers();
    }
  }, [activeTab, fetchUsers, fetchPortalUsers]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: usersPagination.page.toString(),
      limit: usersPagination.limit.toString(),
      sortBy,
      sortOrder,
    });

    if (appliedSearch) params.append('search', appliedSearch);
    if (appliedRole) params.append('role', appliedRole);
    if (appliedStatus) params.append('status', appliedStatus);
    if (appliedTerritory) params.append('territory', appliedTerritory);

    try {
      const response = await fetch(`/api/admin/accounts/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users);
      setUsersPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [
    usersPagination.page,
    usersPagination.limit,
    sortBy,
    sortOrder,
    appliedSearch,
    appliedRole,
    appliedStatus,
    appliedTerritory,
  ]);

  const fetchPortalUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: portalUsersPagination.page.toString(),
      limit: portalUsersPagination.limit.toString(),
      sortBy,
      sortOrder,
    });

    if (appliedSearch) params.append('search', appliedSearch);
    if (appliedRole) params.append('role', appliedRole);
    if (appliedStatus) params.append('status', appliedStatus);

    try {
      const response = await fetch(`/api/admin/accounts/portal-users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portal users');
      }

      setPortalUsers(data.portalUsers);
      setPortalUsersPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portal users');
    } finally {
      setLoading(false);
    }
  }, [
    portalUsersPagination.page,
    portalUsersPagination.limit,
    sortBy,
    sortOrder,
    appliedSearch,
    appliedRole,
    appliedStatus,
  ]);

  const handleSearch = () => {
    setAppliedFilters({ ...filters });
    if (activeTab === 'internal') {
      setUsersPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      setPortalUsersPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleClearFilters = () => {
    const cleared = createFilterState();
    setFilters(cleared);
    setAppliedFilters(cleared);
    if (activeTab === 'internal') {
      setUsersPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      setPortalUsersPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Are you sure you want to deactivate ${selectedIds.length} user(s)?`)) {
      return;
    }

    // TODO: Implement bulk deactivate API
    alert('Bulk deactivate not yet implemented');
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    const currentList = activeTab === 'internal' ? users : portalUsers;
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map(item => item.id));
    }
  };

  const pagination = activeTab === 'internal' ? usersPagination : portalUsersPagination;
  const setPagination = activeTab === 'internal' ? setUsersPagination : setPortalUsersPagination;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">User Accounts</h1>
          <Link
            href="/admin/accounts/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Account
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('internal');
                setSelectedIds([]);
              }}
              className={`${
                activeTab === 'internal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Internal Users
            </button>
            <button
              onClick={() => {
                setActiveTab('portal');
                setSelectedIds([]);
              }}
              className={`${
                activeTab === 'portal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Portal Users
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-4 py-2 border rounded-lg"
            />

            <input
              type="text"
              placeholder="Filter by role..."
              value={role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
              className="px-4 py-2 border rounded-lg"
            />

            <select
              value={status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              {activeTab === 'internal' ? (
                <>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </>
              ) : (
                <>
                  <option value="ACTIVE">Active</option>
                  <option value="INVITED">Invited</option>
                  <option value="DISABLED">Disabled</option>
                </>
              )}
            </select>

            {activeTab === 'internal' && (
              <input
                type="text"
                placeholder="Filter by territory..."
                value={territory}
                onChange={(e) => setFilters((prev) => ({ ...prev, territory: e.target.value }))}
                className="px-4 py-2 border rounded-lg"
              />
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} user(s) selected
            </span>
            <button
              onClick={handleBulkDeactivate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Deactivate Selected
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading accounts...</p>
        </div>
      ) : (
        <>
          {/* Internal Users Table */}
          {activeTab === 'internal' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === users.length && users.length > 0}
                        onChange={toggleAllSelection}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Territory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelection(user.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{user.primaryRole}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.territory || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/accounts/user/${user.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No internal users found.
                </div>
              )}
            </div>
          )}

          {/* Portal Users Table */}
          {activeTab === 'portal' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === portalUsers.length && portalUsers.length > 0}
                        onChange={toggleAllSelection}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Linked Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portalUsers.map((portalUser) => (
                    <tr key={portalUser.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(portalUser.id)}
                          onChange={() => toggleSelection(portalUser.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{portalUser.fullName}</div>
                        <div className="text-sm text-gray-500">{portalUser.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{portalUser.primaryRole}</span>
                      </td>
                      <td className="px-6 py-4">
                        {portalUser.customer ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{portalUser.customer.name}</div>
                            <div className="text-sm text-gray-500">{portalUser.customer.accountNumber}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          STATUS_COLORS[portalUser.status]
                        }`}>
                          {portalUser.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {portalUser.lastLoginAt ? new Date(portalUser.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/accounts/portal-user/${portalUser.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {portalUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No portal users found.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
