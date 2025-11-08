'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle,
  Wrench,
} from 'lucide-react';

type AffectedRecord = {
  id: string;
  entityType: string;
  details: Record<string, unknown>;
};

type RuleDetails = {
  rule: {
    id: string;
    name: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    hasFix: boolean;
  };
  issueCount: number;
  affectedRecords: AffectedRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();

  const [ruleId, setRuleId] = useState<string | null>(null);
  const [data, setData] = useState<RuleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [fixing, setFixing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (params?.ruleId) {
      setRuleId(params.ruleId as string);
    }
  }, [params]);

  const fetchRuleDetails = useCallback(async () => {
    if (!ruleId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/admin/data-integrity/${ruleId}?page=${page}&limit=50`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch details');
      }
    } catch (err: unknown) {
      setError('Network error occurred');
      console.error('Error fetching rule details:', err);
    } finally {
      setLoading(false);
    }
  }, [ruleId, page]);

  useEffect(() => {
    if (ruleId) {
      fetchRuleDetails();
    }
  }, [ruleId, fetchRuleDetails]);

  const toggleRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const toggleAll = () => {
    if (selectedRecords.size === data?.affectedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(data?.affectedRecords.map(r => r.id) || []));
    }
  };

  const handleFix = async () => {
    if (!data || selectedRecords.size === 0) return;

    // For different rule types, we may need different fix parameters
    let fixParams: Record<string, unknown> = {};

    // Special handling for assign-sales-rep
    if (ruleId === 'customers-without-sales-rep') {
      const salesRepId = prompt('Enter Sales Rep ID to assign:');
      if (!salesRepId) return;
      fixParams = { salesRepId };
    }

    // Special handling for missing-inventory-locations
    if (ruleId === 'missing-inventory-locations') {
      const location = prompt('Enter location name (default: MAIN):') || 'MAIN';
      fixParams = { location };
    }

    try {
      setFixing(true);
      const response = await fetch(`/api/admin/data-integrity/${ruleId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds: Array.from(selectedRecords),
          params: fixParams,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✓ ${result.message}`);
        setSelectedRecords(new Set());
        await fetchRuleDetails();
      } else {
        alert(`✗ Error: ${result.error}`);
      }
    } catch (err: unknown) {
      alert('Network error occurred');
      console.error('Error fixing records:', err);
    } finally {
      setFixing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error: {error || 'No data'}</span>
          </div>
          <button
            onClick={() => router.push('/admin/data-integrity')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { rule, issueCount, affectedRecords, pagination } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/data-integrity')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className={`border rounded-lg p-6 ${getSeverityColor(rule.severity)}`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">{getSeverityIcon(rule.severity)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{rule.name}</h1>
                <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">
                  {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                </span>
                <span className="px-2 py-1 bg-white rounded text-xs font-medium uppercase">
                  {rule.severity}
                </span>
              </div>
              <p className="text-sm opacity-90">{rule.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {rule.hasFix && affectedRecords.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRecords.size === affectedRecords.length}
                  onChange={toggleAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedRecords.size} selected)
                </span>
              </label>
            </div>

            <button
              onClick={handleFix}
              disabled={selectedRecords.size === 0 || fixing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Wrench className="w-4 h-4" />
              {fixing ? 'Fixing...' : `Fix Selected (${selectedRecords.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {rule.hasFix && (
                  <th className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.size === affectedRecords.length}
                      onChange={toggleAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {affectedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {rule.hasFix && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={() => toggleRecord(record.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.entityType}
                  </td>
                  <td className="px-6 py-4">
                    <dl className="space-y-1">
                      {Object.entries(record.details).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <dt className="font-medium text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </dt>
                          <dd className="text-gray-900">
                            {value instanceof Date
                              ? value.toLocaleString()
                              : String(value || '-')}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Records */}
        {affectedRecords.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              All Clear!
            </h3>
            <p className="text-green-700">
              No issues found for this validation rule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
