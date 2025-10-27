"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import JobStatsCards from "./_components/JobStatsCards";
import JobFilters, { FilterState } from "./_components/JobFilters";
import JobsTable from "./_components/JobsTable";
import JobDetailsModal from "./_components/JobDetailsModal";

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

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function JobsAdminPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check admin permissions
  useEffect(() => {
    fetch("/api/sales/auth/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const roles = data.user?.roles || [];
        const isAdmin = roles.some(
          (r: { role: { code: string } }) =>
            r.role.code === "sales.admin" || r.role.code === "admin"
        );

        if (!isAdmin) {
          router.push("/sales/dashboard");
          return;
        }

        setUserRole("admin");
        setIsChecking(false);
      })
      .catch(() => {
        router.push("/sales/dashboard");
      });
  }, [router]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filters.status,
        type: filters.type,
        search: filters.search,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const res = await fetch(`/api/admin/jobs?${params}`);
      const data = await res.json();

      if (data.success) {
        setJobs(data.data.jobs);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchJobs();
    }
  }, [userRole, fetchJobs]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (userRole !== 'admin') return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 10000);

    return () => clearInterval(interval);
  }, [userRole, fetchJobs]);

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  // Handle retry single job
  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' })
      });

      if (res.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
      alert('Failed to retry job');
    }
  };

  // Handle delete single job
  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert('Failed to delete job');
    }
  };

  // Handle bulk retry
  const handleBulkRetry = async (jobIds: string[]) => {
    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', jobIds })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Retried ${data.data.updated} job(s)`);
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to retry jobs:', error);
      alert('Failed to retry jobs');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (jobIds: string[]) => {
    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', jobIds })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Deleted ${data.data.deleted} job(s)`);
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to delete jobs:', error);
      alert('Failed to delete jobs');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Job Queue Monitor</h1>
          <p className="mt-2 text-gray-600">
            Monitor background jobs, view errors, and retry failed tasks
          </p>
        </div>

        {/* Stats Cards */}
        <JobStatsCards />

        {/* Filters */}
        <JobFilters onFilterChange={handleFilterChange} />

        {/* Jobs Table */}
        <JobsTable
          jobs={jobs}
          loading={loading}
          onJobClick={setSelectedJob}
          onBulkRetry={handleBulkRetry}
          onBulkDelete={handleBulkDelete}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const page = i + 1;
                  const showPage =
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.page) <= 1;

                  if (!showPage && page === 2) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  if (!showPage && page === pagination.totalPages - 1) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Job Details Modal */}
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRetry={handleRetryJob}
          onDelete={handleDeleteJob}
        />
      </div>
    </div>
  );
}
