'use client';

import { useState, useEffect } from 'react';
import { X, Copy, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface DetailModalProps {
  logId: string;
  onClose: () => void;
}

interface AuditLogDetail {
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
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  reason: string | null;
}

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  STATUS_CHANGE: 'bg-orange-100 text-orange-800',
  REASSIGN: 'bg-purple-100 text-purple-800',
};

export default function DetailModal({ logId, onClose }: DetailModalProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'changes' | 'raw'>('changes');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLogDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  const fetchLogDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/audit-logs/${logId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch log details');
      }

      setLog(data.log);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJSON = () => {
    if (!log) return;

    const jsonData = JSON.stringify(
      {
        changes: log.changes,
        metadata: log.metadata,
      },
      null,
      2
    );

    navigator.clipboard.writeText(jsonData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  const getEntityLink = (entityType: string, entityId: string): string | null => {
    const links: Record<string, string> = {
      Customer: `/admin/customers/${entityId}`,
      Order: `/admin/orders/${entityId}`,
      Invoice: `/admin/invoices/${entityId}`,
      User: `/admin/users/${entityId}`,
    };
    return links[entityType] || null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            {error || 'Failed to load log details'}
          </div>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const entityLink = getEntityLink(log.entityType, log.entityId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Audit Log Details</h2>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  ACTION_COLORS[log.action as keyof typeof ACTION_COLORS] ||
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {log.action}
              </span>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Metadata Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-gray-500">User</div>
                <div className="font-medium">
                  {log.user ? (
                    <>
                      <div>{log.user.name}</div>
                      <div className="text-sm text-gray-600">{log.user.email}</div>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">System</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Timestamp</div>
                <div className="font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Entity Type</div>
                <div className="font-medium">{log.entityType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Entity ID</div>
                <div className="font-medium flex items-center gap-2">
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {log.entityId}
                  </code>
                  {entityLink && (
                    <Link
                      href={entityLink}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800"
                      title="View entity"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
              {log.ipAddress && (
                <div>
                  <div className="text-sm text-gray-500">IP Address</div>
                  <div className="font-medium">{log.ipAddress}</div>
                </div>
              )}
              {log.reason && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Reason</div>
                  <div className="font-medium">{log.reason}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 border-b">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('changes')}
                className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === 'changes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Changes
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === 'raw'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Raw JSON
              </button>
            </div>
          </div>

          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div>
              {log.action === 'CREATE' && (
                <div>
                  <h4 className="font-semibold mb-2">Created Values</h4>
                  {log.metadata && typeof log.metadata === 'object' ? (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No creation data available</p>
                  )}
                </div>
              )}

              {log.action === 'DELETE' && (
                <div>
                  <h4 className="font-semibold mb-2">Deleted Values</h4>
                  {log.changes ? (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No deletion data available</p>
                  )}
                </div>
              )}

              {(log.action === 'UPDATE' || log.action === 'STATUS_CHANGE' || log.action === 'REASSIGN') && (
                <div>
                  <h4 className="font-semibold mb-3">Field Changes</h4>
                  {log.changes && Object.keys(log.changes).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(log.changes).map(([field, change]) => (
                        <div
                          key={field}
                          className="bg-gray-50 border border-gray-200 rounded p-4"
                        >
                          <div className="font-medium text-sm text-gray-700 mb-2">
                            {field}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Before</div>
                              <div className="bg-red-50 border border-red-200 rounded p-2">
                                <pre className="text-sm overflow-x-auto">
                                  {formatValue(change.old)}
                                </pre>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">After</div>
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <pre className="text-sm overflow-x-auto">
                                  {formatValue(change.new)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No changes recorded</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Raw JSON Tab */}
          {activeTab === 'raw' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Raw JSON Data</h4>
                <button
                  onClick={handleCopyJSON}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
                <pre className="text-sm">
                  {JSON.stringify(
                    {
                      changes: log.changes,
                      metadata: log.metadata,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-between">
          <Link
            href={`/api/admin/audit-logs/entity/${log.entityType}/${log.entityId}`}
            target="_blank"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <FileText className="h-4 w-4" />
            View All Logs for This Entity
          </Link>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
