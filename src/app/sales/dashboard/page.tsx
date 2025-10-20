'use client';

import { useCallback, useEffect, useState } from "react";
import PerformanceMetrics from "./sections/PerformanceMetrics";
import CustomerHealthSummary from "./sections/CustomerHealthSummary";
import CustomersDueList from "./sections/CustomersDueList";
import WeeklyRevenueChart from "./sections/WeeklyRevenueChart";
import UpcomingEvents from "./sections/UpcomingEvents";
import TasksList from "./sections/TasksList";
import ProductGoals from "./sections/ProductGoals";
import UpcomingCalendar from "./sections/UpcomingCalendar";
import AssignedTasks from "./sections/AssignedTasks";
import Incentives from "./sections/Incentives";

type DashboardData = {
  salesRep: {
    id: string;
    name: string;
    email: string;
    territory: string;
    deliveryDay: string | null;
    weeklyQuota: number;
    monthlyQuota: number;
    quarterlyQuota: number;
    annualQuota: number;
  };
  metrics: {
    currentWeek: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastWeek: {
      revenue: number;
    };
    comparison: {
      revenueChange: number;
      revenueChangePercent: string;
    };
    weeklyMetrics?: {
      inPersonVisits: number;
      tastingAppointments: number;
      emailContacts: number;
      phoneContacts: number;
      textContacts: number;
      newCustomersAdded: number;
      reactivatedCustomers: number;
    } | null;
  };
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    closed: number;
    total: number;
  };
  activities: {
    recent: Array<{
      id: string;
      type: string;
      typeCode: string;
      subject: string;
      notes: string | null;
      occurredAt: string;
      customer: {
        id: string;
        name: string;
      } | null;
      outcome: string | null;
    }>;
    summary: Record<string, number>;
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    eventType: string | null;
    location: string | null;
    customer: {
      id: string;
      name: string;
    } | null;
  }>;
  customersDue: Array<{
    id: string;
    name: string;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    averageOrderIntervalDays: number | null;
    riskStatus: string;
    daysOverdue: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    status: string;
    customer: {
      id: string;
      name: string;
    } | null;
  }>;
};

type DashboardState = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

export default function SalesDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/sales/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        // Redirect to login if session expired
        if (response.status === 401) {
          window.location.href = "/sales/login";
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load dashboard.");
      }

      const payload = (await response.json()) as DashboardData;
      setState({ data: payload, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load dashboard.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-slate-200" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-slate-200" />
        </div>
      </main>
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
        <section className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-medium">We couldn't load your dashboard just now.</p>
          <p className="mt-1">{state.error ?? "Try again shortly or contact support."}</p>
          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  const { salesRep, metrics, customerHealth, upcomingEvents, customersDue, tasks } = state.data;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      <PerformanceMetrics salesRep={salesRep} metrics={metrics} />

      {/* Active Incentives & Competitions - TEMPORARILY DISABLED */}
      {/* <Incentives /> */}

      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyRevenueChart
          currentWeekRevenue={metrics.currentWeek.revenue}
          lastWeekRevenue={metrics.lastWeek.revenue}
          revenueChangePercent={metrics.comparison.revenueChangePercent}
        />
        <CustomerHealthSummary customerHealth={customerHealth} />
      </div>

      {/* Product Performance Goals - TEMPORARILY DISABLED */}
      {/* <ProductGoals /> */}

      {/* 7-10 Day Upcoming Calendar - TEMPORARILY DISABLED */}
      {/* <UpcomingCalendar /> */}

      <CustomersDueList customers={customersDue} />

      {/* Tasks Assigned by Manager - TEMPORARILY DISABLED */}
      {/* <AssignedTasks /> */}

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingEvents events={upcomingEvents} />
        <TasksList tasks={tasks} />
      </div>
    </main>
  );
}
