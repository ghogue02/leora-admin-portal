"use client";

import { useState } from "react";

interface Job {
  id: string;
  type: string;
  status: string;
  payload: any;
  error?: string | null;
  attempts: number;
  createdAt: string;
  completedAt?: string | null;
}

interface JobDetailsModalProps {
  job: Job | null;
  onClose: () => void;
  onRetry?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

export default function JobDetailsModal({
  job,
  onClose,
  onRetry,
  onDelete
}: JobDetailsModalProps) {
  const [copying, setCopying] = useState(false);

  if (!job) return null;

  const handleCopyJson = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (start: string, end?: string | null) => {
    if (!end) return 'N/A';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Job Details</h2>
            <p className="text-sm text-gray-500 mt-1 font-mono">{job.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Status and Type */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                {job.status.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <span className="inline-flex px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {job.type}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p className="text-sm text-gray-900">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed</label>
              <p className="text-sm text-gray-900">
                {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Processing Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attempts</label>
              <p className="text-sm text-gray-900">{job.attempts} / 3</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <p className="text-sm text-gray-900">
                {formatDuration(job.createdAt, job.completedAt)}
              </p>
            </div>
          </div>

          {/* Payload */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Payload</label>
              <button
                onClick={() => handleCopyJson(job.payload)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {copying ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* Error */}
          {job.error && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-red-700">Error Message</label>
                <button
                  onClick={() => handleCopyJson(job.error)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Copy Error
                </button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <pre className="text-xs text-red-800 whitespace-pre-wrap break-words">
                  {job.error}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {job.status === 'failed' && onRetry && (
            <button
              onClick={() => {
                onRetry(job.id);
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Retry Job
            </button>
          )}
          {(job.status === 'completed' || job.status === 'failed') && onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this job?')) {
                  onDelete(job.id);
                  onClose();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Delete Job
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
