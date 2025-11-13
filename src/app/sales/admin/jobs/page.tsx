"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveCard } from "@/components/ui/responsive-card";
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
      <main className="layout-shell-tight layout-stack pb-12">
        <ResponsiveCard className="flex flex-col items-center gap-3 text-sm text-gray-600">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          Validating admin permissions...
        </ResponsiveCard>
      </main>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Operations</p>
        <h1 className="text-3xl font-bold text-gray-900">Job queue monitor</h1>
        <p className="text-sm text-gray-600">
          Track imports, enrichment, and reporting jobs from any device.
        </p>
      </header>

      <section className="layout-stack">
        <JobStatsCards />
        <JobFilters onFilterChange={handleFilterChange} />
        <JobsTable
          jobs={jobs}
          loading={loading}
          onJobClick={setSelectedJob}
          onBulkRetry={handleBulkRetry}
          onBulkDelete={handleBulkDelete}
        />
      </section>

      {pagination.totalPages > 1 && (
        <ResponsiveCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-semibold">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold">{pagination.total}</span> jobs
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="touch-target rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

                if (!showPage && (page === 2 || page === pagination.totalPages - 1)) {
                  return (
                    <span key={`ellipsis-${page}`} className="px-2 text-sm text-gray-500">
                      ...
                    </span>
                  );
                }
                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`touch-target rounded-md border px-3 py-2 text-sm font-medium transition ${
                      page === pagination.page
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-gray-700 hover:bg-slate-50"
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
              className="touch-target rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </ResponsiveCard>
      )}

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onRetry={handleRetryJob}
        onDelete={handleDeleteJob}
      />
    </main>
  );
}
