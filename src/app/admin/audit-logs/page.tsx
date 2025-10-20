'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileDown, RefreshCw, Filter, X, AlertTriangle } from 'lucide-react';
import DetailModal from './components/DetailModal';

interface AuditLog {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string;
  changedFields: string[];
  changedFieldsCount: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  STATUS_CHANGE: 'bg-orange-100 text-orange-800',
  REASSIGN: 'bg-purple-100 text-purple-800',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupInstructions, setSetupInstructions] = useState<string[]>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [userId, setUserId] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter options
  const [users, setUsers] = useState<User[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  // Modal
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, sortBy, sortOrder]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [usersRes, entityTypesRes] = await Promise.all([
        fetch('/api/admin/audit-logs/users'),
        fetch('/api/admin/audit-logs/entity-types'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (entityTypesRes.ok) {
        const entityTypesData = await entityTypesRes.json();
        setEntityTypes(entityTypesData.entityTypes);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      sortBy,
      sortOrder,
    });

    if (userId) params.append('userId', userId);
    if (actions.length > 0) params.append('action', actions.join(','));
    if (entityType) params.append('entityType', entityType);
    if (entityId) params.append('entityId', entityId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    try {
      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();

      if (!response.ok) {
        // Check if setup is required (table doesn't exist)
        if (data.setupRequired) {
          setSetupRequired(true);
          setSetupInstructions(data.instructions || []);
          setError(data.message || 'Database setup required');
        } else {
          throw new Error(data.error || 'Failed to fetch audit logs');
        }
        return;
      }

      setLogs(data.logs);
      setPagination(data.pagination);
      setSetupRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setUserId('');
    setActions([]);
    setEntityType('');
    setEntityId('');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || undefined,
          action: actions.length > 0 ? actions.join(',') : undefined,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      alert('Export failed: ' + message);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const toggleAction = (action: string) => {
    setActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const hasActiveFilters =
    userId || actions.length > 0 || entityType || entityId || dateFrom || dateTo;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-gray-600 mt-1">
            Track all changes and actions across the system
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/audit-logs/stats"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-2"
          >
            View Statistics
          </Link>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export to CSV
          </button>
          <button
            onClick={fetchLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded ${
            hasActiveFilters
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Filter Audit Logs</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Entity Types</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity ID Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity ID
              </label>
              <input
                type="text"
                placeholder="Search by entity ID..."
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Action Checkboxes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div className="flex flex-wrap gap-3">
              {['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'REASSIGN'].map(
                (action) => (
                  <label
                    key={action}
                    className="inline-flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={actions.includes(action)}
                      onChange={() => toggleAction(action)}
                      className="mr-2 cursor-pointer"
                    />
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ACTION_COLORS[action as keyof typeof ACTION_COLORS] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {action}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading audit logs...</p>
        </div>
      ) : error ? (
        <div className={`border rounded-lg p-6 ${setupRequired ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`flex items-start gap-3 ${setupRequired ? 'text-yellow-800' : 'text-red-700'}`}>
            <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {setupRequired ? 'Database Setup Required' : 'Error Loading Audit Logs'}
              </h3>
              <p className="mb-4">{error}</p>

              {setupRequired && setupInstructions.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-yellow-300">
                  <h4 className="font-medium mb-3">Setup Instructions:</h4>
                  <div className="space-y-2">
                    {setupInstructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600 font-mono text-sm">{index + 1}.</span>
                        <code className="bg-gray-100 px-3 py-1 rounded text-sm flex-1">
                          {instruction}
                        </code>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> After running migrations, refresh this page to see your audit logs.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={fetchLogs}
                className={`mt-4 px-4 py-2 rounded font-medium ${
                  setupRequired
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    Date/Time{' '}
                    {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('action')}
                  >
                    Action {sortBy === 'action' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('entityType')}
                  >
                    Entity Type{' '}
                    {sortBy === 'entityType' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left">Entity ID</th>
                  <th className="px-4 py-3 text-left">Changed Fields</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <div className="font-medium">{log.user.name}</div>
                            <div className="text-sm text-gray-500">
                              {log.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            ACTION_COLORS[log.action as keyof typeof ACTION_COLORS] ||
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entityType}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.entityId.substring(0, 8)}...
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {log.changedFieldsCount > 0 ? (
                          <div className="text-sm">
                            {log.changedFields.slice(0, 3).join(', ')}
                            {log.changedFieldsCount > 3 && (
                              <span className="text-gray-500">
                                {' '}
                                +{log.changedFieldsCount - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLogId(log.id)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} logs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLogId && (
        <DetailModal logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
      )}
    </div>
  );
}
