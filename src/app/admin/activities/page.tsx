"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LogActivityButton from "@/components/shared/LogActivityButton";
import type { SampleSkuSummary } from "@/types/activities";

type SampleItem = {
  id: string;
  skuId: string;
  sampleListItemId: string | null;
  feedback: string;
  followUpNeeded: boolean;
  followUpCompletedAt: string | null;
  sku: SampleSkuSummary | null;
};

type AdminActivity = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcomes: string[];
  activityType: {
    id: string;
    name: string | null;
    code: string | null;
  };
  customer:
    | {
        id: string;
        name: string | null;
      }
    | null;
  user:
    | {
        id: string;
        fullName: string;
        email: string;
      }
    | null;
  samples: SampleItem[];
};

type ActivitiesResponse = {
  activities: AdminActivity[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

type SalesRepOption = {
  id: string;
  territoryName: string | null;
  user: {
    fullName: string;
    email: string;
  };
};

const FOLLOW_UP_FILTERS = [
  { value: "all", label: "All activity" },
  { value: "open", label: "Open sample follow-ups" },
  { value: "with-samples", label: "Activities with samples" },
];

const formatDate = (value: string | null) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    totalPages: 1,
    totalCount: 0,
  });
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [salesRepId, setSalesRepId] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchSalesReps();
  }, []);

  const fetchSalesReps = async () => {
    try {
      const response = await fetch("/api/admin/sales-reps");
      if (!response.ok) {
        throw new Error("Failed to load sales reps");
      }
      const data = await response.json();
      setSalesReps(data.reps || []);
    } catch (err) {
      console.error("Failed to fetch sales reps:", err);
    }
  };

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (searchQuery) params.set("search", searchQuery);
      if (salesRepId !== "all") params.set("salesRepId", salesRepId);
      if (followUpFilter !== "all") params.set("followUp", followUpFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/admin/activities?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to load activities.");
      }

      const data = (await response.json()) as ActivitiesResponse;
      setActivities(data.activities || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination.totalPages,
        totalCount: data.pagination.totalCount,
      }));
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setError(err instanceof Error ? err.message : "Unable to load activities.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    searchQuery,
    salesRepId,
    followUpFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  const handlePageChange = (nextPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(prev.totalPages, nextPage)),
    }));
  };

  const salesRepOptions = useMemo(() => {
    return salesReps
      .map((rep) => ({
        value: rep.id,
        label: rep.user.fullName
          ? `${rep.user.fullName}${rep.territoryName ? ` • ${rep.territoryName}` : ""}`
          : rep.territoryName ?? rep.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salesReps]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Activity Monitor</h1>
        <p className="text-sm text-gray-600">
          Review every logged activity across the sales team, including sample feedback and open follow-ups.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="search" className="text-xs font-semibold uppercase text-gray-500">
              Search
            </label>
            <Input
              id="search"
              placeholder="Subject, customer, notes…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-gray-500">Sales Rep</span>
            <Select
              value={salesRepId}
              onValueChange={(value) => {
                setSalesRepId(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reps</SelectItem>
                {salesRepOptions.map((rep) => (
                  <SelectItem key={rep.value} value={rep.value}>
                    {rep.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-gray-500">Follow-Up Status</span>
            <Select
              value={followUpFilter}
              onValueChange={(value) => {
                setFollowUpFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="dateFrom" className="text-xs font-semibold uppercase text-gray-500">
                From
              </label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dateTo" className="text-xs font-semibold uppercase text-gray-500">
                To
              </label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing page {pagination.page} of {pagination.totalPages} • {pagination.totalCount} activities
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Loading activity…</p>
        </section>
      ) : error ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">Unable to load activity log.</p>
          <p className="mt-1">{error}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              void fetchActivities();
            }}
          >
            Retry
          </Button>
        </section>
      ) : activities.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
          No activities found for the selected filters.
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sales Rep
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Samples
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activities.map((activity) => {
                const occurredAt = formatDate(activity.occurredAt);
                const customer = activity.customer;
                const hasOpenFollowUp = activity.samples.some(
                  (sample) => sample.followUpNeeded && !sample.followUpCompletedAt
                );

                return (
                  <tr key={activity.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{occurredAt}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{activity.subject}</p>
                        <p className="text-xs text-gray-500">
                          {activity.activityType?.name ?? activity.activityType?.code ?? "—"}
                        </p>
                        {activity.notes && (
                          <p className="text-xs text-gray-500 line-clamp-2">{activity.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {customer ? (
                        <Link
                          href={`/sales/customers/${customer.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          {customer.name ?? "View customer"}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {activity.user ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-900">{activity.user.fullName}</p>
                          <p className="text-xs text-gray-500">{activity.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activity.samples.length === 0 ? (
                        <span className="text-xs text-gray-400">No samples</span>
                      ) : (
                        <div className="space-y-2">
                          {activity.samples.map((sample) => (
                            <div
                              key={sample.id}
                              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {sample.sku?.name ?? sample.sku?.code ?? "Sample"}
                                </span>
                                {sample.followUpNeeded && !sample.followUpCompletedAt && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    Follow-up
                                  </span>
                                )}
                              </div>
                              {sample.feedback && (
                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                  “{sample.feedback}”
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {customer && (
                          <LogActivityButton
                            customerId={customer.id}
                            variant="secondary"
                            size="sm"
                            label="Log Follow-up"
                          />
                        )}
                        {hasOpenFollowUp && (
                          <span className="text-xs font-semibold text-amber-700">
                            {activity.samples.filter(
                              (sample) => sample.followUpNeeded && !sample.followUpCompletedAt
                            ).length}{" "}
                            open
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
