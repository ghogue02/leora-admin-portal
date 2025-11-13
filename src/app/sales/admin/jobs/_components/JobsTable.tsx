"use client";

import { useState } from "react";
import { ResponsiveCard } from "@/components/ui/responsive-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";

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

interface JobsTableProps {
  jobs: Job[];
  loading: boolean;
  onJobClick: (job: Job) => void;
  onBulkRetry?: (jobIds: string[]) => void;
  onBulkDelete?: (jobIds: string[]) => void;
}

export default function JobsTable({
  jobs,
  loading,
  onJobClick,
  onBulkRetry,
  onBulkDelete,
}: JobsTableProps) {
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map((job) => job.id)));
    }
  };

  const handleBulkAction = (action: "retry" | "delete") => {
    const selectedJobIds = Array.from(selectedJobs);
    if (!selectedJobIds.length) return;

    if (action === "retry" && onBulkRetry) {
      onBulkRetry(selectedJobIds);
    } else if (action === "delete" && onBulkDelete) {
      if (confirm(`Delete ${selectedJobIds.length} job(s)?`)) {
        onBulkDelete(selectedJobIds);
      } else {
        return;
      }
    }
    setSelectedJobs(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <ResponsiveCard className="flex flex-col items-center gap-3 text-sm text-gray-600">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        Loading jobs...
      </ResponsiveCard>
    );
  }

  if (!jobs.length) {
    return (
      <ResponsiveCard className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100 text-3xl leading-[3.5rem] text-slate-400">
          📭
        </div>
        <p className="text-base font-semibold text-gray-900">No jobs found</p>
        <p className="text-sm text-gray-600">Try adjusting filters or check back later.</p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="layout-stack">
      {selectedJobs.size > 0 && (
        <ResponsiveCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-blue-50">
          <span className="text-sm font-medium text-blue-900">
            {selectedJobs.size} job{selectedJobs.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction("retry")}
              className="touch-target rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Retry selected
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("delete")}
              className="touch-target rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete selected
            </button>
          </div>
        </ResponsiveCard>
      )}

      <ResponsiveTable stickyHeader>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedJobs.size === jobs.length && jobs.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3">Job ID</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Attempts</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("input, button")) return;
                  onJobClick(job);
                }}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedJobs.has(job.id)}
                    onChange={() => toggleJobSelection(job.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-700">
                  {job.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 text-gray-900">{job.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{job.attempts} / 3</td>
                <td className="px-6 py-4 text-gray-600">{formatDate(job.createdAt)}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    type="button"
                    className="text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJobClick(job);
                    }}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </div>
  );
}
